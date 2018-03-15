#!/usr/bin/env node
const { spawn } = require('child_process');
const program = require('commander');

function addCarton(dir) {
    return new Promise((resolve,reject) => {
        let carton = spawn('git', ['clone', 'https://github.com/thinkingjuice/carton.git', dir], { stdio: 'inherit' });
        carton.on('close', (code) => {
            if (code === 0) {
                console.log('Carton downloaded');
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

function removeGit(dir) {
    return new Promise((resolve, reject) => {
        let remove = spawn('rm', ['-rf', `.git`], { cwd: dir });
        remove.on('close', code => {
            if (code === 0) {
                resolve();
            }
        })
    });
}

function addFlavour(dir) {
    console.log('adding flavour');
    return new Promise((resolve,reject) => {
        let flavour = spawn('git', ['clone', 'https://github.com/thinkingjuice/flavourcss.git', `wp-content/themes/carton/src/scss`], { stdio: 'inherit', cwd: dir });
        flavour.on('close', code => {
            if (code === 0) {
                resolve();
            }
        })
    });
}

function addStraw(dir) {
    return new Promise((resolve, reject) => {
        let straw = spawn('git', ['clone', 'https://github.com/thinkingjuice/straw.git', 'straw'], { stdio: 'inherit'});
        straw.on('close', code => {
            if (code === 0) {
                resolve();
            }
        })
    })
}

function moveContents(target, dest) {
    return new Promise((resolve, reject) => {
        let pwd = spawn('pwd', { stdio: 'inherit'});
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
        let remove = spawn('rm', ['-rf', dir], { stdio: 'inherit' });
        remove.on('close', code => {
            if (code === 0) {
                resolve();
            }
        })
    })
}

program
    .command('new <dir>')
    .action(async (dir, cmd) => {
        await addCarton(dir);
        await removeGit(dir);
        await addStraw(dir);
        await addFlavour(dir);
        await moveContents('straw', dir); //moves everything from start into target dir root
        await removeDir('straw');
        await Promise.all([installCarton(dir),installStraw(dir)]); // install composer and npm at the same time
    });

program.parse(process.argv);