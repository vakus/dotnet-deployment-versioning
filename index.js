const core = require('@actions/core');
const util = require('util');
const execFile = util.promisify(require('child_process').execFile);
const glob = require("glob");
const { Bump } = require('./bump');

// most @actions toolkit packages have async methods
async function run() {
  try {
    //prevent self triggering
    if(process.env.GITHUB_REF.startsWith('refs/tags/')){
      core.info(`Run triggered by tag ${process.env.GITHUB_REF.replace('refs/tags/', '')}. `);
      return;
    }
    //fetch the tags...
    core.debug(await execFile('git', ['fetch', '--depth=1', 'origin', 'refs/tags/*:refs/tags/*']));

    //generate version
    var version = await generateVersion();

    core.info(`full version code: ${version}`);
    
    //read the project files and update their version
    const versionFileSearch = core.getInput("dotnet_project_files") || "**/*.csproj";

    const versionFiles = glob.sync(versionFileSearch, {
      gitignore: true,
      expandDirectories: true,
      onlyFiles: true,
      ignore: [],
      cwd: process.cwd(),
    });

    const changedFiles = versionFiles.filter(file => {
      var bump = new Bump(file);
      return bump.bump(version);
    });


    //stage all files for 
    for(const file of changedFiles){
      core.debug(`adding file to commit ${file}`);
      core.debug(await execFile('git', ['add', file]));
    }

    core.debug(await execFile('git', ['config', 'user.email', 'actions@users.noreply.github.com']));
		core.debug(await execFile('git', ['config', 'user.name', 'dotnet-deployment-versioning']));

    core.debug(await execFile('git', ['status']));

    core.debug(await execFile('git', ['commit', '-m', `Bumped up versions to ${version}`]));

    core.debug(`pushing commits`);
    core.debug(await execFile('git', ['push']));

    const tag_git = core.getInput('git_create_tag');
    core.debug(`git_create_tag is set to ${tag_git}`);
    if(tag_git === true){
      core.debug(`creating tag ${version}`);
      core.debug(await execFile('git', ['tag', version, '-m', version]));
      core.debug(await execFile('git', ['push', 'origin', version]));
    }
    
    

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();

async function generateVersion() {
  core.info(`Generating dotnet version`);
  //get today date
  const date = (new Date());
  const year = date.getFullYear() % 100;
  const month = date.getMonth() + 1;
  const day = date.getDate();

  //generate patch code
  var version = `${year}.${month}.${day}.`;

  core.debug(`Date based version so far '${version}'`);

  //get count of tags starting with current version number
  const { stdout: todayTags } = await execFile('git', ['tag', '-l', `${version}*`]);
  const patch = todayTags.split('\n').length;

  version += `${patch}`;
  return version;
}

