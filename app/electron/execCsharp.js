const { exec } = require('node:child_process')

exec('cd ../csharp/bin/Release/net7.0 && ./csharp', (error, stdout, stderr) => {
  if (error) {
    console.log(`error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.log(`stderr: ${stderr}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
});
