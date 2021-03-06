#!/usr/bin/env node
const { spawn } = require('child_process');
const program = require('commander');
const fs = require('fs');
const mkdirp = require('mkdirp');
const { promisify } = require('util');
const hogan = require('hogan.js');
const prompts = require('prompts');
const rimraf = require('rimraf');
const Configstore = require('configstore');
const generator = require('generate-password');

const config = new Configstore('juicebox', {
    core: 'https://github.com/friendsthatcode/carton.git',
    theme: 'https://github.com/friendsthatcode/carton-theme.git',
    gulp: 'https://github.com/friendsthatcode/straw.git',
    scss: 'https://github.com/friendsthatcode/flavourcss.git'
});

function newProjectQuestions(dir) {
    return [{
            type: 'text',
            name: 'dbName',
            message: 'Please enter DB name',
            initial: dir
        },
        {
            type: 'text',
            name: 'dbUser',
            message: 'Please enter the DB username',
            initial: dir
        },
        {
            type: 'password',
            name: 'dbPass',
            message: 'Please enter the DB pass'
        },
        {
            type: 'text',
            name: 'dbHost',
            message: 'Please enter DB host',
            initial: 'localhost'
        },
        {
            type: 'text',
            name: 'siteUrl',
            message: 'Please enter a site url (used in .env and browsersync proxy)',
            initial: `${dir}.local`
        },
        {
            type: 'text',
            name: 'themeName',
            message: 'Please enter a wordpress theme name',
            initial: dir
        }
    ];
}

function addCarton(dir) {
    return new Promise((resolve,reject) => {
        let carton = spawn('git', ['clone', config.get('core'), dir], { stdio: 'inherit' });
        carton.on('close', (code) => {
            if (code === 0) {
                console.log('Carton downloaded');
                resolve();
            }
        });
    })
}

function addCartonTheme(dir, themeName) {
    return new Promise((resolve, reject) => {
        let carton = spawn('git', ['clone', config.get('theme'), themeName], { stdio: 'inherit', cwd: dir });
        carton.on('close', (code) => {
            if (code === 0) {
                console.log('Carton Theme downloaded');
                resolve();
            }
        });
    })
}

function installCarton(dir) {
    return new Promise((resolve, reject) => {
        let composer = spawn('composer', ['install'], { stdio: 'inherit', cwd: dir });
        composer.on('close', code => {
            if (code === 0) {
                resolve();
            }
        });
    })
}

function installStraw(dir) {
    return new Promise((resolve, reject) => {
        let npm = spawn('npm', ['i'], { stdio: 'inherit', cwd: dir }, { stdio: 'inherit'});
        npm.on('close', code => {
            if (code === 0) {
                resolve();
            }
        });
    })
}

function removeAllGit(dir) {
    return new Promise((resolve, reject) => {
        rimraf(`${dir}/**/.git`, status => {
            if (status === null) {
                resolve();
            }
        })
    })
}

function addFlavour(dir, themeName) {
    console.log('adding flavour');
    return new Promise((resolve,reject) => {
        let flavour = spawn('git', ['clone', config.get('scss'), `wp-content/themes/${themeName}/src/scss`], { stdio: 'inherit', cwd: dir });
        flavour.on('close', code => {
            if (code === 0) {
                resolve();
            }
        })
    });
}

function addStraw(dir) {
    return new Promise((resolve, reject) => {
        let straw = spawn('git', ['clone', config.get('gulp'), 'straw'], { stdio: 'inherit'});
        straw.on('close', code => {
            if (code === 0) {
                resolve();
            }
        })
    })
}

async function moveContents(target, dest) {
    await createIfNotExists(dest);
    return new Promise((resolve, reject) => {
        let move = spawn('cp', ['-R', `${target}/`, `${dest}/`], { stdio: 'inherit'});
        move.on('close', code => {
            if (code === 0) {
                resolve();
            }
        })
    })
}

function removeDir(dir) {
    return new Promise((resolve, reject) => {
        rimraf(dir, status => {
            if (status === null) {
                resolve();
            }
        })
    })
}

function cleanupHomeDirectory(dir) {
    return new Promise((resolve, reject) =>.
        let move = spawn('cp', ['-r ', dir, '.'], { stdio: 'inherit'});
        move.on('close', code => {
            if (code === 0) {
                resolve();
            }
        })
    })
}

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const removeFile = promisify(fs.unlink);
const stat = promisify(fs.stat);
const mkDir = promisify(mkdirp);
/**
 * Used to parse a file, replace vars using hogan and then save it out again
 * Accepts the data you want to replace on and additionally a new filename
 * will delete the old file if you give it a new name
 * @param {string} filename 
 * @param {object} data
 * @param {string} newName
 */
async function parseFile(filename, data, newName = filename) {
    let file = await readFile(filename, 'utf8');
    let template = hogan.compile(file);
    let rendered = template.render(data);
    await writeFile(newName, rendered);
    if (newName !== filename) {
        removeFile(filename);
    }
}

async function createIfNotExists(path) {
    return new Promise(async (resolve, reject) => {
        try {
            let exists = await stat(path);
            resolve();
        } catch(err) {
            if (err.code === 'ENOENT') {
                try {
                    await mkDir(path);
                    resolve();
                } catch(mkErr) {
                    console.log(mkErr);
                }
            } else {
                reject();
            }
        }
    })
}

//pass in the response so we can easily use it in parseFile function
async function generateSalts(response) {
    let salts ={};
    let keys = ['auth_key','secure_auth_key','logged_in_key','nonce_key','auth_salt','secure_auth_salt','logged_in_salt','nonce_salt'];
    keys.forEach(key => {
        let password = generator.generate({
            length: 64,
            numbers: true,
            symbols: true,
            uppercase: true
        });
        salts[key] = password;
    });
    return salts;
}

program.version('0.0.1');

program
    .command('new <dir>')
    .description('Used to generate a new wordpress site pulled from the various repositries')
    .action(async (dir, cmd) => {
        let response = await prompts(newProjectQuestions(dir));
        response.salts = await generateSalts(response);
        await addCarton(dir); //add carton core
        await addStraw(dir); // add webpack/gulp setup
        await moveContents('straw', dir); //moves everything from start into target dir root
        await removeDir('straw'); //remove temp folder
        await addCartonTheme(dir, response.themeName); //add the basic theme
        await moveContents(`${dir}/${response.themeName}`, `${dir}/wp-content/themes/${response.themeName}`); // move it to the right place
        await removeDir(`${dir}/${response.themeName}`); // remove temp folder
        await addFlavour(dir, response.themeName); //add the scss structure to the theme
        await parseFile(`${dir}/wp-content/themes/${response.themeName}/style.css`, response); // change themeName to one provided
        await parseFile(`${dir}/package.json`, response); //Change themeName in package.json
        await parseFile(`${dir}/webpack.config.js`, response); //Change themename in webpack config
        await parseFile(`${dir}/gulpfile.js`, response); // change themename in gulpfile
        await parseFile(`${dir}/.env.example`, response, `${dir}/.env`); //add in db details and more into env
        await Promise.all([installCarton(dir),installStraw(dir)]); // install composer and npm at the same time
        await removeAllGit(dir); // do this last, to ensure .git is also removed from plugin directories
        await cleanupHomeDirectory(dir); // really do this last, to get the folder structure in place for your new site
    });

program
    .command('config <key> <val>')
    .description(`Use this to change any known config keys, or edit directly here --> ${config.path}`)
    .action(async (key, val, cmd) => {
        let all = config.all;
        if (typeof all[key] !== 'undefined') {
            config.set(key, val);
        } else {
            console.log(`Sorry that isn't an option`);
        }
        console.log(`You can edit the file by hand here --> ${config.path}`);
    });

program.parse(process.argv);