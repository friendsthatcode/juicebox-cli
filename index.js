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

program
    .command('new <dir>')
    .action(async (dir, cmd) => {
        await addCarton(dir);
        await installCarton(dir);
        await removeGit(dir);
        await addFlavour(dir);
        console.log('now add flavour');
    });

program.parse(process.argv);