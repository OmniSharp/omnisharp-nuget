var _ = require("lodash");
var child_process_1 = require("child_process");
var readline = require("readline");
var fs_1 = require("fs");
var sources = [
    'https://www.myget.org/F/aspnetmaster/api/v2',
    'https://www.myget.org/F/aspnetrelease/api/v2',
    'https://nuget.org/api/v2/',
    'https://www.myget.org/F/omnisharp/api/v2',
    'https://www.myget.org/F/xunit/api/v2',
    'https://www.myget.org/F/nugetbuild/api/v2',
];
var sourcesComplete = 0;
_.each(sources, function (source) {
    var items = {};
    var tokens = [];
    var args = ['list', '-source'].concat([source]).concat(['-pre']);
    var child = child_process_1.spawn("nuget.exe", args, { stdio: 'pipe' });
    var rl = readline.createInterface({
        input: child.stdout,
        output: child.stdin
    });
    rl.on('line', function (input) {
        var _a = input.split(' '), name = _a[0], version = _a[1];
        console.log(source, ' <==> ', name);
        var key;
        if (name.indexOf('.') > -1) {
            var nameTokens = name.split('.');
            key = nameTokens[0].toLowerCase();
        }
        else {
            tokens.push(name.toLowerCase());
        }
        if (key) {
            tokens.push(key);
            if (!items[key])
                items[key] = [];
            items[key].push(name);
        }
    });
    child.on('close', function () {
        sourcesComplete++;
        var path = 'resources/' + _.trim(source, '/').replace('www.', '').replace('https://', '').replace('http://', '').replace(/\/|\:/g, '-');
        try {
            fs_1.mkdirSync(path);
        }
        catch (e) { }
        fs_1.writeFileSync(path + '/_keys.json', JSON.stringify(_.unique(_.sortBy(tokens))));
        _.each(items, function (item, key) {
            fs_1.writeFileSync(path + '/' + key + '.json', JSON.stringify(_.sortBy(item)));
        });
        if (sourcesComplete === sources.length) {
            process.exit();
        }
    });
});
process.stdin.resume();
