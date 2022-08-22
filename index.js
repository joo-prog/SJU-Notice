const cron = require('node-cron');
const dotenv = require('dotenv');
const { App } = require('@slack/bolt');
const crawling = require('./crawling');

dotenv.config();

const app = new App({
    token: process.env.TOKEN,
    signingSecret: process.env.SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.APP_TOKEN,
    port: process.env.PORT || 3000
});

async function message(block) {
    await app.client.chat.postMessage({
        channel: 'C03U19KCXU7',
        text: '공지사항이 업로드되었습니다.',
        blocks: block
    });
}

app.action('remind_click', async ({ body, ack, client }) => {
    await ack();
    await client.reminders.add({
        token: process.env.USER_TOKEN,
        text: body.actions[0].value,
        time: 'in 6 hours'
    });
    await client.chat.postMessage({
        channel: body.user.id,
        text: `${body.actions[0].value}(이)가 6시간 후에 리마인드됩니다.`
    });
});

(async () => {
    await app.start();
    console.log('⚡️ Bolt app is running!');
})();

async function main() {
    const res = await crawling();
    if (res.length !== 0) message(res);
    cron.schedule('*/5 * * * *', async () => {
        console.log('------'+new Date() + '실행------');
        const res = await crawling();
        if (res.length !== 0) message(res);
    })
}

main();