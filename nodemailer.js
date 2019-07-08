#!/usr/bin/env node

/**
 * 本命令直接项目根目录下 ./go.js 即可
 * 并提供可选参数：
 * -- help 帮助文档
 * -i 忽略模式
 */

const addressee = 'youremail@qq.com';

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
    transporter(account).verify((error, success) => {
      if (error) {
        console.log(colorMap.brightRed, "\n\n登录失败！\n\n", error);
        reject();
      } else {
        console.log(colorMap.brightGreen, "登陆成功！正在发送邮件...");
        resolve(account);
      }
    });
  });
}

/**
 * 发送邮件
 */
function sendMail(account) {
  console.log(111111)

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
    }, (error, info) => {
      if (error) {
        console.log(colorMap.brightGreen, "邮件发送失败：\n", error);
        reject();
      }
      console.log(colorMap.brightGreen, "\n邮件发送成功！");
      resolve();
    });
  });

}

/**
 * 打包并压缩 build 文件夹
 */
function compress() {
  return new Promise((resolve, reject) => {
    console.log(colorMap.brightYellow, '\n\n正在压缩文件...\n');
    exec('tar -cvzf build.tar.gz ./build/', (err, stdout, stderr) => {
      if (err) {
        console.log(colorMap.brightRed, '压缩出错：\n', stderr);
        reject();
      } else {
        console.log(stdout);
        console.log(colorMap.brightGreen, '压缩成功！\n');
        resolve();
      }
    })
  });
}

function start(order) {
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
      rl.output.write("\x1B[2K\x1B[200D" + '> 请输入密码：' + (new Array(rl.line.length + 1).toString().replace(/,/g, '*')));
    else
      rl.output.write(stringToWrite);
  };

  rl.on('close', () => {
    bye(false);
  });

  rl.question('> 请输入域账号：', username => {
    // 不输入直接回车会退出程序
    if (!username) bye();
    rl.stdoutMuted = true;
    rl.question('> 请输入密码：', password => {
      if (!password) bye();
      verify({ username, password })
      // [order === 'ignore' ? 'finally' : 'then'](() => compress(), bye(1))
        .then(compress(), bye(1))
        .then(sendMail({ username, password }), bye(1))
        .then(bye(0), bye(1));

      sendMail({ username, password })
    });
  });
};

/**
 * 处理命令行参数
 */
switch (process.argv[2]) {
  case '--help':
    console.log(`
    输入域账号和密码 --> 打包 --> 压缩 --> 自动邮件发送给李总。参数如下：
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
