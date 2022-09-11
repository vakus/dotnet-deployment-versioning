const process = require('process');
const cp = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');

const { run } = require("./index");

test('update csproj without push', async () => {
  const myTestDir = createCleanTestRepository();

  process.env['INPUT_AUTO_PUSH'] = 'false';
  process.env['GITHUB_REF'] = 'test';

  await runBumpup(myTestDir);

  const status = cp.execSync('git status', {
    cwd: myTestDir
  }).toString();

  expect(status).toContain("Your branch is ahead of");
  expect(status).toContain("by 1 commit");

  const author = cp.execSync('git log -1 --pretty=format:"%an <%ae>"', {
    cwd: myTestDir
  }).toString();

  expect(author).toBe("dotnet-deployment-versioning <actions@users.noreply.github.com>");
});

test('update csproj on detached head', async () => {

  const myTestDir = createCleanTestRepository();

  process.env['INPUT_AUTO_PUSH'] = 'false';
  process.env['GITHUB_REF'] = 'test';

  cp.execSync('git checkout 1d27974c187b5d87ad1a0e9202818db8c45f5c7e', {
    cwd: myTestDir
  });

  await runBumpup(myTestDir);

  const status = cp.execSync('git status', {
    cwd: myTestDir
  }).toString();

  expect(status).toContain("HEAD detached at 1d27974");
  expect(status).toContain("nothing to commit, working tree clean");
});



async function runBumpup(myTestDir) {
  oldCwd = process.cwd();
  process.chdir(myTestDir);
  await run();
  process.chdir(oldCwd);
}

function createCleanTestRepository() {
  const testDir = path.join(os.tmpdir(), "dotnet-deployment-versioning-test");

  let myTestDir = testDir + "-" + crypto.randomUUID().toString();

  fs.cpSync(testDir, myTestDir, {
    recursive: true
  });

  return myTestDir;
}

afterAll(() => {
  fs.readdirSync(os.tmpdir())
    .filter(name => name.startsWith("dotnet-deployment-versioning-test"))
    .map(f => fs.rmSync(path.join(os.tmpdir(), f), {recursive: true}))
});

beforeAll(() => {
  cp.execSync('git clone https://github.com/vakus/dotnet-deployment-versioning-test.git', {
    cwd: os.tmpdir()
  });
})