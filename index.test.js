const process = require('process');
const cp = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');

const { run } = require("./index");

test.each([
  {
    commit_username: "",
    commit_email: ""
  },
  {
    commit_username: "chr\'; echo \'test\';#",
    commit_email: "chr\'; echo \'test\';#@users.noreply.github.com"
  }
])('update csproj by username ($commit_username) and email ($commit_email) is commited by default user', async ({commit_username, commit_email}) => {
  const myTestDir = createCleanTestRepository();

  process.env['INPUT_AUTO_PUSH'] = 'false';
  process.env['GITHUB_REF'] = 'test';
  process.env['INPUT_COMMIT_USERNAME'] = commit_username;
  process.env['INPUT_COMMIT_EMAIL'] = commit_email;
  process.env['INPUT_COMMIT_FORCE_NO_GPG'] = 'true';

  await runBumpup(myTestDir);

  const status = cp.execSync('git status', {
    cwd: myTestDir
  }).toString();

  expect(status).toContain("Your branch is ahead of");
  expect(status).toContain("by 1 commit");

  const author = cp.execSync('git log -1 --pretty=format:"%an <%ae>"', {
    cwd: myTestDir
  }).toString();

  const username = cp.execSync('git config --get user.name').toString().trim();
  const email = cp.execSync('git config --get user.email').toString().trim();

  expect(author).toBe(username + " <" + email + ">");
});

test.each([
  {
    commit_username: "vakus",
    commit_email: "vakus@users.noreply.github.com",
    commit_expected: "vakus <vakus@users.noreply.github.com>"
  }
])('update csproj without push with username $commit_username and email $commit_email is committed by $commit_expected', async ({commit_username, commit_email, commit_expected}) => {
  const myTestDir = createCleanTestRepository();

  process.env['INPUT_AUTO_PUSH'] = 'false';
  process.env['GITHUB_REF'] = 'test';
  process.env['INPUT_COMMIT_USERNAME'] = commit_username;
  process.env['INPUT_COMMIT_EMAIL'] = commit_email;
  process.env['INPUT_COMMIT_FORCE_NO_GPG'] = 'true';

  await runBumpup(myTestDir);

  const status = cp.execSync('git status', {
    cwd: myTestDir
  }).toString();

  expect(status).toContain("Your branch is ahead of");
  expect(status).toContain("by 1 commit");

  const author = cp.execSync('git log -1 --pretty=format:"%an <%ae>"', {
    cwd: myTestDir
  }).toString();

  expect(author).toBe(commit_expected);
});

test('update csproj without commit', async () => {
  const myTestDir = createCleanTestRepository();

  process.env['INPUT_AUTO_PUSH'] = 'false';
  process.env['INPUT_CREATE_COMMIT'] = 'false';
  process.env['GITHUB_REF'] = 'test';
  process.env['INPUT_COMMIT_FORCE_NO_GPG'] = 'true';

  await runBumpup(myTestDir);

  const status = cp.execSync('git status', {
    cwd: myTestDir
  }).toString();

  expect(status).toContain("Changes not staged for commit:");
  expect(status).toContain("no changes added to commit");

  const author = cp.execSync('git log -1 --pretty=format:"%an <%ae>"', {
    cwd: myTestDir
  }).toString();

  expect(author).not.toBe("dotnet-deployment-versioning <actions@users.noreply.github.com>");
});

test('update csproj without push', async () => {
  const myTestDir = createCleanTestRepository();

  process.env['INPUT_AUTO_PUSH'] = 'false';
  process.env['INPUT_CREATE_COMMIT'] = 'true';
  process.env['GITHUB_REF'] = 'test';
  process.env['INPUT_COMMIT_FORCE_NO_GPG'] = 'true';

  await runBumpup(myTestDir);

  const status = cp.execSync('git status', {
    cwd: myTestDir
  }).toString();


  expect(status).toContain("Your branch is ahead of");
  expect(status).toContain("by 1 commit");
});

test('update csproj on detached head', async () => {

  const myTestDir = createCleanTestRepository();

  process.env['INPUT_AUTO_PUSH'] = 'false';
  process.env['INPUT_CREATE_COMMIT'] = 'true';
  process.env['GITHUB_REF'] = 'test';
  process.env['INPUT_COMMIT_FORCE_NO_GPG'] = 'true';

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

test('update triggered by tag is ignored', async () => {
  const myTestDir = createCleanTestRepository();

  process.env['INPUT_AUTO_PUSH'] = 'false';
  process.env['INPUT_CREATE_COMMIT'] = 'true';
  process.env['GITHUB_REF'] = 'refs/tags/test';
  process.env['INPUT_COMMIT_FORCE_NO_GPG'] = 'true';

  await runBumpup(myTestDir);

  const status = cp.execSync('git status', {
    cwd: myTestDir
  }).toString();

  expect(status).toContain("On branch master");
  expect(status).toContain("Your branch is up to date with 'origin/master'");
  expect(status).toContain("nothing to commit, working tree clean");
});

async function runBumpup(myTestDir) {
  let oldCwd = process.cwd();
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
    .map(f => fs.rmSync(path.join(os.tmpdir(), f), { recursive: true }))
});

beforeAll(() => {
  cp.execSync('git clone https://github.com/vakus/dotnet-deployment-versioning-test.git', {
    cwd: os.tmpdir()
  });
})