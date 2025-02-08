const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

'use strict';


const port = 81;
const baseDirectory = __dirname; // Serve files from the current directory

const server = http.createServer((req, res) => {
    try {
        const parsedUrl = url.parse(req.url);
        // Prevent directory traversal vulnerability
        const safePath = path.normalize(parsedUrl.pathname).replace(/^(\.\.[\/\\])+/, '');
        let fsPath = path.join(baseDirectory, safePath);

        fs.stat(fsPath, (err, stats) => {
            if (err) {
                res.statusCode = 404;
                res.end('404: File Not Found');
                return;
            }

            // If directory, try to serve index.html
            if (stats.isDirectory()) {
                fsPath = path.join(fsPath, 'index.html');
            }

            fs.readFile(fsPath, (err, data) => {
                if (err) {
                    res.statusCode = 500;
                    res.end('500: Internal Server Error rts');
                    return;
                }

                res.statusCode = 200;
                // Set a simple content-type based on file extension
                const extname = path.extname(fsPath).toLowerCase();
                let contentType = 'text/plain';
                if (extname === '.html') {
                    contentType = 'text/html';
                } else if (extname === '.css') {
                    contentType = 'text/css';
                } else if (extname === '.js') {
                    contentType = 'application/javascript';
                } else if (extname === '.json') {
                    contentType = 'application/json';
                } else if (extname === '.png') {
                    contentType = 'image/png';
                } else if (extname === '.jpg' || extname === '.jpeg') {
                    contentType = 'image/jpeg';
                }

                res.setHeader('Content-Type', contentType);
                res.end(data);
            });
        });
    } catch (error) {
        res.statusCode = 500;
        res.end('500: Internal Server Error');
        console.error(error);
    }
});

server.listen(port, '0.0.0.0', () => {
    console.log(`Server is running at http://localhost:${port}`);
});