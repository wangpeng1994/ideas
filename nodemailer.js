#!/usr/bin/env node

/**
 * 本命令直接项目根目录下 ./go.js 即可
 * 并提供可选参数：
 * -- help 帮助文档
 * -i 忽略模式
 */

const addressee = 'youremail@qq.com'; // 指定收件人

const nodemailer = require('nodemailer');
const path = require('path');
const fs = require("fs");
const readline = require('readline')
const exec = require('child_process').exec;

const colorMap = {
  "brightBlue": "\x1b[1;34m",
  "brightMagenta": "\x1b[1;35m",
  "brightRed": "\x1b[1;31m",
  "brightGreen": "\x1b[1;32m",
  "brightYellow": "\x1b[1;33m",
  "brightCyan": "\x1b[1;36m",
  "brightWhite": "\x1b[1;37m"
}
// Object.keys(colorMap).map(c => console.log(colorMap[c], '我是测试文本，我有不同的颜色'));

/**
 * 初始化发送器
 */
const transporter = (account) => nodemailer.createTransport({
  // server: 'mail.yourcompany.com',
  host: 'mail.yourcompany.com',
  port: 465, // 25 TLS: 465
  secure: true, // use TLS
  tls: {
    // do not fail on invalid certs
    rejectUnauthorized: false
  },
  auth: {
    user: `${account.username}@yourcompany.com`,
    pass: account.password
  }
});

/**
* 验证连接和账户密码
*/
function verify(account) {
  return new Promise((resolve, reject) => {
    transporter(account).verify((err, success) => {
      if (err) {
        console.log(colorMap.brightRed, "\n\n登录失败 ×\n", err);
        reject();
      } else {
        console.log(colorMap.brightGreen, "\n\n登陆成功 √");
        resolve();
      }
    });
  });
}

/**
 * 发送邮件
 */
function sendMail(account) {
  return new Promise((resolve, reject) => {
    transporter(account).sendMail({
      from: `${account.username}@yourcompany.com`,
      to: addressee,
      subject: "测试使用node发送邮件",
      text: "请注意查收附件！\n本邮件由前端打包后自动发送。",
      attachments: [
        {
          'filename': 'build.tar.gz',
          'path': path.resolve(__dirname, 'build.tar.gz')
        }
      ]
    }, (err, info) => {
      if (err) {
        console.log(colorMap.brightGreen, "邮件发送失败 ×\n", err);
        reject();
      }
      console.log(colorMap.brightGreen, "邮件发送成功 √");
      resolve();
    });
  });

}

/**
 * 打包并压缩 build 文件夹
 */
function compress() {
  return new Promise((resolve, reject) => {
    console.log(colorMap.brightYellow, '\n正在压缩文件...\n');
    // TODO: 回头添加 npm run build &&
    exec('tar -cvzf build.tar.gz ./build/', (err, stdout, stderr) => {
      if (err) {
        console.log(colorMap.brightRed, '压缩出错 ×\n', stderr);
        reject();
      } else {
        console.log(stdout);
        console.log(colorMap.brightGreen, '压缩成功 √ \n');
        resolve();
      }
    })
  });
}

/**
 * 命令行交互
 */
async function start(order) {
  const rl = readline.createInterface({  //创建接口
    input: process.stdin,
    output: process.stdout
  })
  const bye = code => () => {
    console.log(colorMap.brightBlue, '\n再见！');
    process.exit(code);
  };

  rl._writeToOutput = function _writeToOutput(stringToWrite) {
    if (rl.stdoutMuted)
      // rl.output.write("\x1B[2K\x1B[200D"+'> 请输入密码：'+((rl.line.length%2==1)?"|":"_"));
      // rl.output.write('\x1B[2K\x1B[200D' + '> 请输入密码：' + (new Array(rl.line.length + 1).toString().replace(/,/g, '*')));
      rl.output.write('\x1B[2K\x1B[200D' + '> 请输入密码：' + '*'.repeat(rl.line.length));
    else
      rl.output.write(stringToWrite);
  };

  rl.on('close', () => {
    bye(false);
  });
  // 封装提问器，避免回调地狱
  const ask = (prompt, cb) => new Promise((resolve, reject) => {
    rl.question(prompt, answer => {
      if (!answer) {
        bye(1);
        reject();
      }
      cb(answer, resolve);
    });
  });
  // 等待输入账号
  const value = await ask('> 请输入域账号：', (answer, resolve) => {
    rl.stdoutMuted = true; // 不显示密码
    resolve(answer); // ask 提供的 cb 中进行解决才能继续 ask
  });
  // 继续等待输入密码
  ask('> 请输入密码：', (answer, resolve) => {
    const account = {
      username: value,
      password: answer
    };
    const ctrl = order === 'ignore' ? 'finally' : 'then';
    verify(account)
    [ctrl](compress, bye(1))
      // 忽略模式下会继续 compress，但能否 sendMail 取决于 verify 结果
      .then(() => sendMail(account))
      .then(bye(0), bye(1));
  });
};

/**
 * 处理命令行参数
 */
switch (process.argv[2]) {
  case '--help':
    console.log(`
    输入域账号和密码 --> 打包 --> 压缩 --> 自动邮件发送给李总，参数如下：\n
    --help：帮助文档
        -i：忽略模式，如果账号验证失败，虽然不会自动发送邮件，但依然会进行打包压缩。
    `);
    break;
  case '-i':
    start('ignore');
    break;
  default:
    start();
}
