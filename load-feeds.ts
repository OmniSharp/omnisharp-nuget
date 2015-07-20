import * as _ from "lodash";
import {spawn} from "child_process";
import readline = require("readline");
import {writeFileSync, mkdirSync} from "fs";
import {Readable, Writable} from "stream";

var sources = [
    'https://www.myget.org/F/aspnetmaster/api/v2',
    'https://www.myget.org/F/aspnetrelease/api/v2',
    'https://nuget.org/api/v2/',
    'https://www.myget.org/F/omnisharp/api/v2',
    'https://www.myget.org/F/xunit/api/v2',
    'https://www.myget.org/F/nugetbuild/api/v2',
];


var sourcesComplete = 0;

_.each(sources, source => {
    var items: { [key: string]: string[] } = {};
    var tokens = [];
    var args = ['list', '-source'].concat([source]).concat(['-pre']);

    var child = spawn("nuget.exe", args, { stdio: 'pipe' });
    var rl = readline.createInterface({
        input: child.stdout,
        output: child.stdin
    });

    rl.on('line', (input: string) => {
        var [name, version] = input.split(' ');
        console.log(source, ' <==> ', name);
        var key;
        if (name.indexOf('.') > -1) {
            var nameTokens = name.split('.');
            key = nameTokens[0].toLowerCase();
        } else {
            tokens.push(name.toLowerCase());
        }
        if (key) {
            tokens.push(key);
            if (!items[key]) items[key] = [];
            items[key].push(name);
        }
    });

    child.on('close', () => {
        sourcesComplete++;

        var path = 'resources/' + _.trim(source, '/').replace('www.', '').replace('https://', '').replace('http://', '').replace(/\/|\:/g, '-');
        try { mkdirSync(path); } catch (e) { }
        writeFileSync(path + '/_keys.json', JSON.stringify(_.unique(tokens)));
        _.each(items, (item, key) => {
            writeFileSync(path + '/' + key + '.json', JSON.stringify(item));
        });

        if (sourcesComplete === sources.length) {
            process.exit();
        }
    });
});

process.stdin.resume();
