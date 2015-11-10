var _ = require("lodash");
var child_process_1 = require("child_process");
var readline = require("readline");
var fs_1 = require("fs");
var path_1 = require("path");
var sources = [
    'https://www.myget.org/F/aspnetmaster/api/v2',
    'https://www.myget.org/F/aspnetrelease/api/v2',
    'https://nuget.org/api/v2/',
    'https://www.myget.org/F/omnisharp/api/v2',
    'https://www.myget.org/F/xunit/api/v2',
    'https://www.myget.org/F/nugetbuild/api/v2',
];
var mirrors = {
    'https://www.myget.org/F/aspnetmaster/api/v2': 'https://www.myget.org/F/aspnetmaster/api/v3/index.json',
    'https://www.myget.org/F/aspnetrelease/api/v2': 'https://www.myget.org/F/aspnetrelease/api/v3/index.json',
    'https://nuget.org/api/v2/': 'https://api.nuget.org/v3/index.json',
    'https://www.myget.org/F/omnisharp/api/v2': 'https://www.myget.org/F/omnisharp/api/v3/index.json',
    'https://www.myget.org/F/xunit/api/v2': 'https://www.myget.org/F/xunit/api/v3/index.json',
    'https://www.myget.org/F/nugetbuild/api/v2': 'https://www.myget.org/F/nugetbuild/api/v3/index.json',
};
var sourcesv3 = [];
var blacklist = ["0xdeafcafe.", "1", "1.", "1BrokerApi.", "2.", "24Rental.", "2GIS", "2GIS.", "2a486f72", "2a486f72.", "32feet", "32feet.", "40-System", "40-System.", "5.", "51Degrees", "51Degrees.", "635177104038094647UploadAndDownLoadPackageWithDotCsNames.", "635189118849445599UploadAndDownLoadPackageWithDotCsNames.", "635200371633764073UploadAndDownLoadPackageWithDotCsNames.", "635219386086358870UploadAndDownLoadPackageWithDotCsNames.", "635242692969900082UploadAndDownLoadPackageWithDotCsNames.", "635273019367610056UploadAndDownLoadPackageWithDotCsNames.", "635278242898664554UploadAndDownLoadPackageWithDotCsNames.", "635279786726963622UploadAndDownLoadPackageWithDotCsNames.", "635279800932883774UploadAndDownLoadPackageWithDotCsNames.", "635285958208507909UploadAndDownLoadPackageWithDotCsNames.", "635285987465939176UploadAndDownLoadPackageWithDotCsNames.", "635297197776860494UploadAndDownLoadPackageWithDotCsNames.", "635297206106180458UploadAndDownLoadPackageWithDotCsNames.", "635309301479019996UploadAndDownLoadPackageWithDotCsNames.", "AA", "AA.", "ABB", "ABB.", "ABBYY.", "ABC", "ABC."];
var sourcesComplete = 0;
try {
    fs_1.mkdirSync("resources");
}
catch (e) { }
function run(nuget, sources) {
    if (sources.length === 0)
        return Promise.resolve();
    return new Promise(function (resolve) {
        _.each(sources, function (source) {
            var items = {};
            var tokens = [];
            var args = ['list', '-source'].concat([source]).concat(['-pre']);
            var mirror = mirrors[source];
            var child = child_process_1.spawn(nuget, args, { stdio: 'pipe' });
            var rl = readline.createInterface({
                input: child.stdout,
                output: child.stdin
            });
            rl.on('line', function (input) {
                var _a = input.split(' '), name = _a[0], version = _a[1];
                var key;
                if (name.indexOf('.') > -1) {
                    var nameTokens = name.split('.');
                    key = nameTokens[0];
                }
                else {
                    tokens.push(name);
                }
                if (key) {
                    tokens.push(key + '.');
                    key = "_" + key + "_";
                    if (!items[key]) {
                        items[key] = [];
                    }
                    if (!_.contains(items[key], name)) {
                        console.log("key: " + key + "   name: " + name);
                        items[key].push(name);
                    }
                }
            });
            child.on('close', function () {
                sourcesComplete++;
                var path = 'resources/' + _.trim(source, '/').replace('www.', '').replace('https://', '').replace('http://', '').replace(/\/|\:/g, '-');
                try {
                    fs_1.mkdirSync(path);
                }
                catch (e) { }
                if (mirror) {
                    var mirrorPath = 'resources/' + _.trim(mirror, '/').replace('www.', '').replace('https://', '').replace('http://', '').replace(/\/|\:/g, '-');
                    try {
                        fs_1.mkdirSync(mirrorPath);
                    }
                    catch (e) { }
                }
                var dotTokens = _(tokens).filter(function (z) { return _.endsWith(z, '.'); }).value();
                tokens = _(tokens)
                    .sortBy()
                    .map(function (z) { return z.split('.')[0]; })
                    .groupBy(function (x) { return x; })
                    .filter(function (x) { return x.length > 1; })
                    .map(function (z) { return z[0]; })
                    .value();
                tokens = _(tokens.concat(dotTokens)).unique().sortBy().value();
                fs_1.writeFileSync(path_1.join(path, '_keys.json'), JSON.stringify(tokens));
                mirrorPath && fs_1.writeFileSync(path_1.join(mirrorPath, '_keys.json'), JSON.stringify(tokens));
                _.each(items, function (values, name) {
                    name = _.trim(name, '_');
                    var obj = {};
                    var objectKeys = [];
                    _.each(values, function (value) {
                        var keys = value.split('.');
                        keys = keys.slice(1);
                        var innerItems = keys.map(function (x, i) { return ({ key: keys.slice(0, i).join('.'), value: keys[i] }); });
                        _.each(innerItems, function (item) {
                            var key = item.key, value = item.value;
                            if (key.length === 0) {
                                objectKeys.push(value + '.');
                            }
                            else {
                                if (!obj[key])
                                    obj[key] = [];
                                obj[key].push(value);
                                if (key.indexOf('.') > -1) {
                                    var previousKeys = key.split('.');
                                    var previousValue = previousKeys[previousKeys.length - 1] + '.';
                                    var previousKey = previousKeys.slice(0, previousKeys.length - 1).join('.');
                                    if (!obj[previousKey])
                                        obj[previousKey] = [];
                                    obj[previousKey].push(previousValue);
                                }
                            }
                        });
                    });
                    obj['_keys'] = _(objectKeys).filter(function (x) { return !_.contains(blacklist, x); }).value();
                    _.each(obj, function (value, key) {
                        obj[key] = _(value).unique().sortBy().value();
                    });
                    fs_1.writeFileSync(path_1.join(path, name.toLowerCase() + '.json'), JSON.stringify(obj));
                    mirrorPath && fs_1.writeFileSync(path_1.join(mirrorPath, name.toLowerCase() + '.json'), JSON.stringify(obj));
                });
                if (sourcesComplete === sources.length) {
                    resolve();
                }
            });
        });
    });
}
run('nuget.exe', sources)
    .then(function () { return run('nuget3.exe', sourcesv3); })
    .then(function () { return process.exit(); });
process.stdin.resume();
