const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createDatabase } = require('../src/database');
const { createUserRepository } = require('../src/userRepository');

function createTestUserRepository() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runninghub-user-credits-'));
  const databasePath = path.join(dataDir, 'app.sqlite');
  const database = createDatabase(databasePath);
  const userRepository = createUserRepository(database);

  return {
    close() {
      if (typeof database.close === 'function') database.close();
      fs.rmSync(dataDir, { recursive: true, force: true });
    },
    userRepository
  };
}

test('registration bonus does not stack with same-day daily login bonus', () => {
  const { close, userRepository } = createTestUserRepository();
  try {
    const todayKey = '2026-07-26';
    const tomorrowKey = '2026-07-27';
    const savedUser = userRepository.saveUser({
      email: 'new-member@example.com',
      displayName: 'New Member',
      role: 'free_user',
      membershipGroup: 'free',
      passwordHash: 'hash',
      status: 'active'
    });

    const registeredUser = userRepository.grantRegisterBonus(savedUser.id);
    const markedUser = userRepository.markDailyLoginBonusClaimed(registeredUser.id, todayKey);
    const sameDayLoginUser = userRepository.grantDailyLoginBonus(markedUser.id, todayKey);
    const sameDayLedger = userRepository.listCreditLedgerByUser(savedUser.id);

    assert.equal(sameDayLoginUser.creditBalance, 100);
    assert.equal(sameDayLedger.length, 1);
    assert.equal(sameDayLedger[0].amount, 100);

    const nextDayLoginUser = userRepository.grantDailyLoginBonus(savedUser.id, tomorrowKey);
    const nextDayLedger = userRepository.listCreditLedgerByUser(savedUser.id);

    assert.equal(nextDayLoginUser.creditBalance, 120);
    assert.equal(nextDayLedger.length, 2);
  } finally {
    close();
  }
});
