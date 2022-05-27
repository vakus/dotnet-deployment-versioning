const core = require('@actions/core');
const fs = require('fs');

export class Bump{
    
    versionRex = /<Version>[\S]*(([0-9]+)\.([0-9]+)\.([0-9]+)\.([0-9]+))[\S]*<\/Version>/i;
    packageVersionRex = /<PackageVersion>[\S]*(([0-9]+)\.([0-9]+)\.([0-9]+)\.([0-9]+))[\S]*<\/PackageVersion>/i;
    assemblyVersionRex = /<AssemblyVersion>[\S]*(([0-9]+)\.([0-9]+)\.([0-9]+)\.([0-9]+))[\S]*<\/AssemblyVersion>/i;
    fileVersionRex = /<FileVersion>[\S]*(([0-9]+)\.([0-9]+)\.([0-9]+)\.([0-9]+))[\S]*<\/FileVersion>/i;
    informationalVersionRex = /<InformationalVersion>[\S]*(([0-9]+)\.([0-9]+)\.([0-9]+)\.([0-9]+))[\S]*<\/InformationalVersion>/gi;

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
        var bumppedContent;
        var modified = false;

        this.versions.forEach((v, k) => {
            const matches = v.exec(originalContent);

            if(matches && matches.length === 6){
                const originVersion = matches[1].toString();
                const originMatch = matches[0].toString();
                const bumppedMatch = originMatch.replace(originVersion, version);
                bumppedContent = originalContent.replace(originMatch, bumppedMatch);
                modified = true;
            }
        });

        if(modified){
            fs.writeFileSync(this.file, bumppedContent, "utf-8");
        }

        return modified;
    }
}
