const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createDatabase } = require('../src/database');
const { createUserRepository } = require('../src/userRepository');

async function createTestUserRepository() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runninghub-user-credits-'));
  const databasePath = path.join(dataDir, 'app.sqlite');
  const database = await createDatabase(databasePath);
  const userRepository = createUserRepository(database);

  return {
    close() {
      if (typeof database.close === 'function') database.close();
      fs.rmSync(dataDir, { recursive: true, force: true });
    },
    userRepository
  };
}

test('registration bonus does not stack with same-day daily login bonus', async () => {
  const { close, userRepository } = await createTestUserRepository();
  try {
    const todayKey = '2026-07-26';
    const tomorrowKey = '2026-07-27';
    const savedUser = await userRepository.saveUser({
      email: 'new-member@example.com',
      displayName: 'New Member',
      role: 'free_user',
      membershipGroup: 'free',
      passwordHash: 'hash',
      status: 'active'
    });

    const registeredUser = await userRepository.grantRegisterBonus(savedUser.id);
    const markedUser = await userRepository.markDailyLoginBonusClaimed(registeredUser.id, todayKey);
    const sameDayLoginUser = await userRepository.grantDailyLoginBonus(markedUser.id, todayKey);
    const sameDayLedger = await userRepository.listCreditLedgerByUser(savedUser.id);

    assert.equal(sameDayLoginUser.creditBalance, 100);
    assert.equal(sameDayLedger.length, 1);
    assert.equal(sameDayLedger[0].amount, 100);

    const nextDayLoginUser = await userRepository.grantDailyLoginBonus(savedUser.id, tomorrowKey);
    const nextDayLedger = await userRepository.listCreditLedgerByUser(savedUser.id);

    assert.equal(nextDayLoginUser.creditBalance, 120);
    assert.equal(nextDayLedger.length, 2);
  } finally {
    close();
  }
});
