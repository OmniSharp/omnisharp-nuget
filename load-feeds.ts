import * as _ from "lodash";
import {spawn} from "child_process";
import readline = require("readline");
import {writeFileSync, mkdirSync} from "fs";
import {Readable, Writable} from "stream";
import {join} from "path";

var sources = [
    'https://www.myget.org/F/aspnetmaster/api/v2',
    'https://www.myget.org/F/aspnetrelease/api/v2',
    'https://nuget.org/api/v2/',
    'https://www.myget.org/F/omnisharp/api/v2',
    'https://www.myget.org/F/xunit/api/v2',
    'https://www.myget.org/F/nugetbuild/api/v2',
];

/* https://www.myget.org/F/feedname/api/v3/index.json */
var sourcesv3 = [
    'https://www.myget.org/F/aspnetmaster/api/v3/index.json',
    'https://www.myget.org/F/aspnetrelease/api/v3/index.json',
    'https://api.nuget.org/v3/index.json',
    'https://www.myget.org/F/omnisharp/api/v3/index.json',
    'https://www.myget.org/F/xunit/api/v3/index.json',
    'https://www.myget.org/F/nugetbuild/api/v3/index.json',
];

var blacklist = ["0xdeafcafe.", "1", "1.", "1BrokerApi.", "2.", "24Rental.", "2GIS", "2GIS.", "2a486f72", "2a486f72.", "32feet", "32feet.", "40-System", "40-System.", "5.", "51Degrees", "51Degrees.", "635177104038094647UploadAndDownLoadPackageWithDotCsNames.", "635189118849445599UploadAndDownLoadPackageWithDotCsNames.", "635200371633764073UploadAndDownLoadPackageWithDotCsNames.", "635219386086358870UploadAndDownLoadPackageWithDotCsNames.", "635242692969900082UploadAndDownLoadPackageWithDotCsNames.", "635273019367610056UploadAndDownLoadPackageWithDotCsNames.", "635278242898664554UploadAndDownLoadPackageWithDotCsNames.", "635279786726963622UploadAndDownLoadPackageWithDotCsNames.", "635279800932883774UploadAndDownLoadPackageWithDotCsNames.", "635285958208507909UploadAndDownLoadPackageWithDotCsNames.", "635285987465939176UploadAndDownLoadPackageWithDotCsNames.", "635297197776860494UploadAndDownLoadPackageWithDotCsNames.", "635297206106180458UploadAndDownLoadPackageWithDotCsNames.", "635309301479019996UploadAndDownLoadPackageWithDotCsNames.", "AA", "AA.", "ABB", "ABB.", "ABBYY.", "ABC", "ABC."]

var sourcesComplete = 0;

try { mkdirSync("resources"); } catch (e) { }

function run(nuget: string, sources: string[]) {
    return new Promise(function(resolve) {
        _.each(sources, source => {
            var items: { [key: string]: string[] } = {};
            var tokens = [];
            var args = ['list', '-source'].concat([source]).concat(['-pre']);

            var child = spawn(nuget, args, { stdio: 'pipe' });
            var rl = readline.createInterface({
                input: child.stdout,
                output: child.stdin
            });

            rl.on('line', (input: string) => {
                var [name, version] = input.split(' ');
                //console.log(source, ' <==> ', name);
                var key;
                if (name.indexOf('.') > -1) {
                    var nameTokens = name.split('.');
                    key = nameTokens[0];
                } else {
                    tokens.push(name);
                }
                if (key) {
                    tokens.push(key + '.');

                    if (!items[key]) items[key] = [];
                    if (!_.contains(items[key], name))
                        items[key].push(name);
                }
            });

            child.on('close', () => {
                sourcesComplete++;

                var path = 'resources/' + _.trim(source, '/').replace('www.', '').replace('https://', '').replace('http://', '').replace(/\/|\:/g, '-');
                try { mkdirSync(path); } catch (e) { }

                var dotTokens = _(tokens).filter(z => _.endsWith(z, '.')).value();

                tokens = _(tokens)
                    .sortBy()
                    .map(z => z.split('.')[0])
                    .groupBy(x => x)
                    .filter<string[]>(x => x.length > 1)
                    .map(z => z[0])
                    .value();

                tokens = _(tokens.concat(dotTokens)).unique().sortBy().value();

                writeFileSync(join(path, '_keys.json'), JSON.stringify(tokens));
                _.each(items, (values, name) => {
                    var obj: { [key: string]: string[] } = {};
                    var objectKeys = [];
                    _.each(values, value => {
                        var keys = value.split('.');
                        keys = keys.slice(1);

                        var items = keys.map((x, i) => ({ key: keys.slice(0, i).join('.'), value: keys[i] }));
                        _.each(items, item => {
                            var {key, value} = item;
                            if (key.length === 0) {
                                objectKeys.push(value + '.');
                            } else {
                                if (!obj[key]) obj[key] = [];
                                obj[key].push(value);

                                if (key.indexOf('.') > -1) {
                                    var previousKeys = key.split('.');
                                    var previousValue = previousKeys[previousKeys.length - 1] + '.';
                                    var previousKey = previousKeys.slice(0, previousKeys.length - 1).join('.');
                                    if (!obj[previousKey]) obj[previousKey] = [];
                                    obj[previousKey].push(previousValue);
                                }
                            }
                        });
                    });

                    obj['_keys'] = _(objectKeys).filter(x => !_.contains(blacklist, x)).value();

                    _.each(obj, (value, key) => {
                        obj[key] = _(value).unique().sortBy().value();
                    });

                    writeFileSync(join(path, name.toLowerCase() + '.json'), JSON.stringify(obj));
                });

                if (sourcesComplete === sources.length) {
                    resolve();
                }
            });
        });
    });
}

run('nuget.exe', sources).then(() => run('nuget3.exe', sourcesv3)).then(() => process.exit());

process.stdin.resume();
