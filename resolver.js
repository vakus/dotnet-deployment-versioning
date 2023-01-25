const core = require('@actions/core');
const util = require('util');
const execFile = util.promisify(require('child_process').execFile);

class Resolver {

    static async HandleException(config, error){
        for(const resolver of Resolver.__resolvers){
            if(resolver.HandleException && await resolver.HandleException(config, error))
                return;
        }
    }

    static __resolvers = [
        {
            async HandleException(config, error){
                let gitUsername = null;

                try{
                    gitUsername = (await execFile('git', ['config', '--get', 'user.name'])).stdout;
                }catch(_){
                    //if username is not set, this will throw
                }

                if(!config.commit_username && !gitUsername){
                    core.warning("It appears that there is no username to be used while creating commit.\n" +
                    "Either use `git config user.name=\"nickname\"`\n" +
                    "or set `commit_username` parameter within the workflow to be not-blank.");
                    return true;
                }
                
                return false;
            }
        },
        {
            async HandleException(config, error){
                let gitEmail = null;

                try{
                    gitEmail = (await execFile('git', ['config', '--get', 'user.email'])).stdout; 
                }catch(_){
                    //if username is not set, this will throw
                }

                if(!config.commit_email && !gitEmail){
                    core.warning("It appears that there is no email to be used while creating commit.\n" +
                    "Either use `git config user.email=\"email@example.com\"`\n" +
                    "or set `commit_email` parameter within the workflow to be not-blank.");
                    return true;
                }

                return false;
            }
        },
        {
            async HandleException(config, error){
                core.warning("An unrecoverable error has occurred within this workflow.\n" + 
                "If this problem repeats please report it at https://github.com/vakus/dotnet-deployment-versioning/issues/new\n" +
                "Please attach log from this workflow in your bug report.\n" + 
                "Diagnostic information:\n" +
                "Git version: " + await execFile('git', ['--version']) + "\n" +
                "Git status: " + await execFile('git', ['status']) + "\n" +
                "Workflow config: " + config + "\n" +
                "Bump generated version: " + config.generated_version);
                return true
            }
        }
    ]
}

module.exports.Resolver = Resolver;