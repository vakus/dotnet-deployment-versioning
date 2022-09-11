const process = require('process');
const cp = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const { run } = require("./index");

const testDir = path.join(os.tmpdir(), "dotnet-deployment-versioning-test");

test('update csproj without push', async () => {
  createCleanTestRepository();

  process.env['INPUT_AUTO_PUSH'] = 'false';
  process.env['GITHUB_REF'] = 'test';

  await runBumpup();

  const status = cp.execSync('git status', {
    cwd: testDir
  }).toString();

  expect(status).toContain("Your branch is ahead of");
  expect(status).toContain("by 1 commit");

  const author = cp.execSync('git log -1 --pretty=format:"%an <%ae>"', {
    cwd: testDir
  }).toString();

  expect(author).toBe("dotnet-deployment-versioning <actions@users.noreply.github.com>")
});

test('update csproj on detached head', async () => {

  createCleanTestRepository();

  process.env['INPUT_AUTO_PUSH'] = 'false';
  process.env['GITHUB_REF'] = 'test';

  cp.execSync('git checkout 1d27974c187b5d87ad1a0e9202818db8c45f5c7e', {
    cwd: testDir
  });

  await runBumpup();

  const status = cp.execSync('git status', {
    cwd: testDir
  }).toString();

  expect(status).toContain("HEAD detached at 1d27974");
  expect(status).toContain("nothing to commit, working tree clean");
});

async function runBumpup() {
  oldCwd = process.cwd();
  process.chdir(testDir);
  await run();
  process.chdir(oldCwd);
}

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