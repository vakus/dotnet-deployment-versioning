const core = require('@actions/core');
const util = require('util');
const execFile = util.promisify(require('child_process').execFile);
const glob = require("glob");
const { Bump } = require('./bump');

async function run() {
  try {
    //prevent self triggering
    if (process.env.GITHUB_REF?.startsWith('refs/tags/') ?? false) {
      core.info(`Run triggered by tag ${process.env.GITHUB_REF.replace('refs/tags/', '')}. `);
      return;
    }

    const ref = await execFile('git', ['rev-parse', '--symbolic-full-name', 'HEAD']);
    //only run if on branch
    if (ref.stdout == 'HEAD\n') {
      //we are not on branch, and we can not continue
      core.info("Reference is not on branch, aborting bumping.");
      return;
    }

    const config = getConfiguration();

    await gitUpdateRepo();

    const version = await generateVersion();

    const changedFiles = dotnetUpdateProjects(config, version);

    await gitStageAndCommit(config, changedFiles, version);

    await gitTagVersion(config, version);

    await gitPushAll(config);
  } catch (error) {
    core.setFailed(error.message);
  }
}

function getConfiguration(){
    let config = {
      commit_username: "",
      commit_email: "",
      commit_create: (core.getInput("create_commit") || 'true').toLowerCase() == "true",
      commit_force_no_gpg: (core.getInput("commit_force_no_gpg") || 'false').toLowerCase() == "true",
      push_auto: (core.getInput("auto_push") || "true").toLowerCase() == "true",
      dotnet_project_files: core.getInput("dotnet_project_files") || "**/*.csproj",
      git_extra_config: []
    }

    if(/^[a-zA-Z0-9\-]*$/.test(core.getInput("COMMIT_USERNAME")))
      config.commit_username = core.getInput("COMMIT_USERNAME");

    if(/^[a-zA-Z0-9\-@\.]*$/.test(core.getInput("COMMIT_EMAIL")))
      config.commit_email = core.getInput("COMMIT_EMAIL")

    if(config.commit_username)
      config.git_extra_config.push("-c", `user.name='${config.commit_username}'`);
    if(config.commit_email)
      config.git_extra_config.push("-c", `user.email='${config.commit_email}'`);

    core.debug(config);

    return config;
}

async function gitPushAll(config) {
  if (config.push_auto) {
    core.info(`pushing commits`);
    core.debug(await execFile('git', ['push', 'origin', '--all']));
    core.info(`pushing tags`);
    core.debug(await execFile('git', ['push', 'origin', '--tags']));
  }
}

async function gitTagVersion(config, version) {
  core.info(`creating tag ${version}`);
  if(config.commit_force_no_gpg)
    core.debug(await execFile('git', config.git_extra_config.concat(['tag', '--no-sign', version, '-m', version])));
  else
    core.debug(await execFile('git', config.git_extra_config.concat(['tag', version, '-m', version])));
}

async function gitStageAndCommit(config, changedFiles, version) {
  if (config.commit_create) {
    for (const file of changedFiles) {
      core.debug(`adding file to commit ${file}`);
      core.debug(await execFile('git', ['add', file]));
    }

    core.debug(await execFile('git', ['status']));

    if(config.commit_force_no_gpg)
      core.debug(await execFile('git', config.git_extra_config.concat(['commit', '-m', `Bumped up versions to ${version}`, '--no-gpg-sign'])));
    else
      core.debug(await execFile('git', config.git_extra_config.concat(['commit', '-m', `Bumped up versions to ${version}`])));
  }
}

function dotnetUpdateProjects(config, version) {
  core.debug(`Searching for projects using pattern: '${config.dotnet_project_files}'`);

  const versionFiles = glob.sync(config.dotnet_project_files, {
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


if (require.main === module) {
  run();
}

module.exports = { run };