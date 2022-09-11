const core = require('@actions/core');
const util = require('util');
const execFile = util.promisify(require('child_process').execFile);
const glob = require("glob");
const { Bump } = require('./bump');

async function run() {
  try {
    //prevent self triggering
    if (process.env.GITHUB_REF.startsWith('refs/tags/')) {
      core.info(`Run triggered by tag ${process.env.GITHUB_REF.replace('refs/tags/', '')}. `);
      return;
    }
    
    const ref = await execFile('git', ['rev-parse', '--symbolic-full-name', 'HEAD']);
    //only run if on branch
    if(ref.stdout == 'HEAD\n'){
      //we are not on branch, and we can not continue
      core.info("Reference is not on branch, aborting bumping.");
      return;
    }

    await gitUpdateRepo();

    await gitSetupAuthor();

    const version = await generateVersion();

    const changedFiles = dotnetUpdateProjects(version);

    await gitStageAndCommit(changedFiles, version);

    await gitTagVersion(version);

    await gitPushAll();
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();

async function gitPushAll() {
  const auto_push = (core.getInput("auto_push") || "true").toLowerCase();
  
  if(auto_push == "true"){
    core.info(`pushing commits`);
    core.debug(await execFile('git', ['push', 'origin', '--all']));
    core.info(`pushing tags`);
    core.debug(await execFile('git', ['push', 'origin', '--tags']));
  }
}

async function gitTagVersion(version) {
  core.info(`creating tag ${version}`);
  core.debug(await execFile('git', ['tag', version, '-m', version]));
}

async function gitStageAndCommit(changedFiles, version) {
  for (const file of changedFiles) {
    core.debug(`adding file to commit ${file}`);
    core.debug(await execFile('git', ['add', file]));
  }

  core.debug(await execFile('git', ['status']));

  core.debug(await execFile('git', ['commit', '-m', `Bumped up versions to ${version}`, '--no-gpg-sign']));
}

async function gitSetupAuthor() {
  core.debug(await execFile('git', ['config', 'user.email', 'actions@users.noreply.github.com']));
  core.debug(await execFile('git', ['config', 'user.name', 'dotnet-deployment-versioning']));
}

function dotnetUpdateProjects(version) {
  const versionFileSearch = core.getInput("dotnet_project_files") || "**/*.csproj";

  core.debug(`Searching for projects using pattern: '${versionFileSearch}'`);

  const versionFiles = glob.sync(versionFileSearch, {
    gitignore: true,
    expandDirectories: true,
    onlyFiles: true,
    ignore: [],
    cwd: process.cwd(),
  });

  const changedFiles = versionFiles.filter(file => {
    let bump = new Bump(file);
    return bump.bump(version);
  });

  return changedFiles;
}

async function gitUpdateRepo() {
  core.info(`fetching tags`);
  core.debug(await execFile('git', ['fetch', 'origin', 'refs/tags/*:refs/tags/*']));
  core.info(`pulling updates`);
  core.debug(await execFile('git', ['pull']));
}

async function generateVersion() {
  core.info(`Generating dotnet version`);
  //get today date
  const date = (new Date());
  const year = date.getFullYear() % 100;
  const month = date.getMonth() + 1;
  const day = date.getDate();

  //generate patch code
  let version = `${year}.${month}.${day}.`;

  core.debug(`Date based version so far '${version}'`);

  //get count of tags starting with current version number
  const { stdout: todayTags } = await execFile('git', ['tag', '-l', `${version}*`]);
  const patch = todayTags.split('\n').length;

  version += `${patch}`;

  core.info(`full version code: ${version}`);
  return version;
}