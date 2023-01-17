# .NET deployment versioning

Github Action to automatically update .NET Core project files with new generated version number (.csproj).
- Generates the version using `yy.MM.dd.patch` format. `patch` starts at 1 on new `yy.MM.dd` tags and increments every deployment on the same `yy.MM.dd`
- Makes changes to .csproj files.
- [Optional] create commit with changes
- Creates git tag with said version.
- [optional] Pushes changes to your git repository.

## Usage

This action requires git to be configured.
```yml
on:
  # Allows you to run this workflow manually from the Actions tab
  workflow_dispatch:
  
jobs:
  bump:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: vakus/dotnet-deployment-versioning@v1.3.0
```

You can also specify csproj files to be affected.
```yml
      - uses: vakus/dotnet-deployment-versioning@v1.3.0
        with:
          #You can use Glob pattern string to find csproj files
          dotnet_project_files: "**/*.csproj"
```

If you do not want the script to push changes
```yml
      - uses: vakus/dotnet-deployment-versioning@v1.3.0
        with:
          auto_push: "false"
```

If you want the changes to not be commited
```yml
      - uses: vakus/dotnet-deployment-versioning@v1.3.0
        with:
          create_commit: "false"
```

If you want to change the user committing changes
```yml
      - uses: vakus/dotnet-deployment-versioning@v1.3.0
        with:
          commit_username: "vakus"
          commit_email: "vakus@users.noreply.github.com"
```

If you need to ignore signing key when running
```yml
      - uses: vakus/dotnet-deployment-versioning@v1.3.0
        with:
          commit_force_no_gpg: "true"
```

## Related

- [SiqiLu/dotnet-bump-version](https://github.com/SiqiLu/dotnet-bump-version) - automatically bumps up version number in .csproj files
- [fregante/daily-version-action](https://github.com/fregante/daily-version-action) - creates daily tag on a git branch
