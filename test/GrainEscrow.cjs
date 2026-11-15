const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("GrainEscrow", function () {
  let kztToken, escrow;
  let admin, buyer, carrier, supplier;
  let BUYER_ROLE, CARRIER_ROLE, SUPPLIER_ROLE;

  beforeEach(async function () {
    [admin, buyer, carrier, supplier] = await ethers.getSigners();

    // 1. Деплоим тестовые тенге
    const MockKZT = await ethers.getContractFactory("MockKZT");
    kztToken = await MockKZT.deploy();

    // 2. Деплоим сам смарт-контракт
    const Escrow = await ethers.getContractFactory("GrainEscrow");
    escrow = await Escrow.deploy(admin.address, await kztToken.getAddress());

    BUYER_ROLE = await escrow.BUYER_ROLE();
    CARRIER_ROLE = await escrow.CARRIER_ROLE();
    SUPPLIER_ROLE = await escrow.SUPPLIER_ROLE(); // Добавили роль поставщика

    // 3. Выдаем роли всем трем участникам
    await escrow.grantRole(BUYER_ROLE, buyer.address);
    await escrow.grantRole(CARRIER_ROLE, carrier.address);
    await escrow.grantRole(SUPPLIER_ROLE, supplier.address); // Выдали права поставщику

    // 4. Даем покупателю 3 миллиона тестовых тенге для сделки
    const amount = ethers.parseUnits("3000000", 18);
    await kztToken.transfer(buyer.address, amount);
    await kztToken.connect(buyer).approve(await escrow.getAddress(), amount);
  });

  it("1. Should deploy and assign roles correctly", async function () {
    expect(await escrow.hasRole(BUYER_ROLE, buyer.address)).to.be.true;
    expect(await escrow.hasRole(CARRIER_ROLE, carrier.address)).to.be.true;
    expect(await escrow.hasRole(SUPPLIER_ROLE, supplier.address)).to.be.true;
  });

  it("2. Should allow BUYER to create a shipment", async function () {
    const deadline = (await time.latest()) + 86400 * 10;
    const valueKzt = ethers.parseUnits("3000000", 18);
    const waybillHash = ethers.encodeBytes32String("hash");

    await escrow.connect(buyer).createShipment(carrier.address, supplier.address, "Astana -> Almaty", 100, valueKzt, deadline, waybillHash);
    
    const shipment = await escrow.getShipment(1);
    expect(shipment.buyer).to.equal(buyer.address);
    expect(shipment.status).to.equal(1); // Статус: Pending
  });

  it("3. Should allow CARRIER to mark shipment in transit", async function () {
    const deadline = (await time.latest()) + 86400 * 10;
    const valueKzt = ethers.parseUnits("3000000", 18);
    const waybillHash = ethers.encodeBytes32String("hash");
    await escrow.connect(buyer).createShipment(carrier.address, supplier.address, "Astana -> Almaty", 100, valueKzt, deadline, waybillHash);
    
    await escrow.connect(carrier).markInTransit(1, waybillHash);
    const shipment = await escrow.getShipment(1);
    expect(shipment.status).to.equal(2); // Статус: InTransit
  });

  it("4. Should allow CARRIER to confirm delivery", async function () {
    const deadline = (await time.latest()) + 86400 * 10;
    const valueKzt = ethers.parseUnits("3000000", 18);
    const waybillHash = ethers.encodeBytes32String("hash");
    await escrow.connect(buyer).createShipment(carrier.address, supplier.address, "Astana -> Almaty", 100, valueKzt, deadline, waybillHash);
    
    await escrow.connect(carrier).confirmDelivery(1, waybillHash);
    const shipment = await escrow.getShipment(1);
    expect(shipment.status).to.equal(3); // Статус: Delivered
  });

  it("5. Should allow SUPPLIER to claim funds after delivery", async function () {
    const deadline = (await time.latest()) + 86400 * 10;
    const valueKzt = ethers.parseUnits("3000000", 18);
    const waybillHash = ethers.encodeBytes32String("hash");
    await escrow.connect(buyer).createShipment(carrier.address, supplier.address, "Astana -> Almaty", 100, valueKzt, deadline, waybillHash);
    await escrow.connect(carrier).confirmDelivery(1, waybillHash);
    
    await escrow.connect(supplier).claimFunds(1);
    const balance = await kztToken.balanceOf(supplier.address);
    expect(balance).to.equal(valueKzt); // Поставщик получил свои деньги
  });
});