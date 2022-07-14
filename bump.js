const core = require('@actions/core');
const fs = require('fs');

class Bump{
    
    versionRex = /<Version>([\S]*)<\/Version>/i;
    packageVersionRex = /<PackageVersion>([\S]*)<\/PackageVersion>/i;
    assemblyVersionRex = /<AssemblyVersion>([\S]*)<\/AssemblyVersion>/i;
    fileVersionRex = /<FileVersion>([\S]*)<\/FileVersion>/i;
    informationalVersionRex = /<InformationalVersion>([\S]*)<\/InformationalVersion>/gi;

    versions = new Map([
        ["Version", this.versionRex],
        ["PackageVersion", this.packageVersionRex],
        ["AssemblyVersion", this.assemblyVersionRex],
        ["FileVersion", this.fileVersionRex],
        ["InformationalVersion", this.informationalVersionRex],
    ]);

    file;

    constructor(file){
        this.file = file;
    }

    bump(version){
        const originalContent = fs.readFileSync(this.file, "utf-8").toString();
        var bumppedContent = originalContent;
        var modified = false;

        this.versions.forEach((v, k) => {
            core.debug(`matching ${k}`);
            const matches = v.exec(bumppedContent);

            if(matches && matches.length === 2){
                core.debug(`match found`);
                const originVersion = matches[1].toString();
                core.debug(`original version: ${originVersion}`);
                const originMatch = matches[0].toString();
                core.debug(`full match: ${originMatch}`);
                const bumppedMatch = originMatch.replace(originVersion, version);
                bumppedContent = bumppedContent.replace(originMatch, bumppedMatch);
                modified = true;
            }
        });

        if(modified){
            fs.writeFileSync(this.file, bumppedContent, "utf-8");
        }

        return modified;
    }
}

module.exports.Bump = Bump;