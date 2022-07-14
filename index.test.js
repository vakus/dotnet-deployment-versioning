const process = require('process');
const cp = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { assert } = require('console');

const testDir = path.join(os.tmpdir(), "dotnet-deployment-versioning-test");

test('update csproj without push', () => {
  createCleanTestRepository();

  process.env['INPUT_AUTO_PUSH'] = 'false';
  process.env['GITHUB_REF'] = 'test';

  const ip = path.join(__dirname, 'index.js');
  const result = cp.execSync(`node ${ip}`, {
    cwd: testDir,
    env: process.env
  }).toString();
  console.log(result);

  const status = cp.execSync('git status', {
    cwd: testDir
  }).toString();

  assert(status.indexOf("Your branch is ahead of") > -1, "Branch should be ahead of remote");
  assert(status.indexOf("by 1 commit.") > -1, "Branch should be ahead of remote by 1 commit");
});

function createCleanTestRepository() {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, {
      recursive: true
    });
  }
  cp.execSync('git clone https://github.com/vakus/dotnet-deployment-versioning-test.git', {
    cwd: os.tmpdir()
  });
}

afterAll(() => {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, {
      recursive: true
    });
  }
});