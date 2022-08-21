const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const dotenv = require('dotenv');

dotenv.config();

const noticeNum = {
    '333': '일반공지',
    '335': '학사',
    '337': '취업',
    '338': '장학'
};

const token = process.env.TOKEN;

async function crawling () {
    const notice = [];
    let sectionNotice;
    for (let key in noticeNum){
        console.log(`-----[${noticeNum[key]}]-----`);
        const html = await axios.get(`http://board.sejong.ac.kr/boardlist.do?bbsConfigFK=${key}`);
        const $ = cheerio.load(html.data);
        const $noticeList = $('table>tbody>tr');
        sectionNotice = [];

        const startDate = new Date();
        startDate.setMinutes(startDate.getMinutes() - 5);
        startDate.setSeconds(0);
        startDate.setMilliseconds(0);

        for (let i = 0; i < $noticeList.length; i++) {
            const url = $($noticeList[i]).find('.subject > a').attr('href').replace('/viewcount.do?rtnUrl=', 'http://board.sejong.ac.kr').replace(/\^/g, '&').match(/.+searchValue=/)[0];
            const subHtml = await axios.get(url);
            const $sub = cheerio.load(subHtml.data);
            const title = $sub('.subject-value').text().replace(/\t|\n/gi, '');
            const date = $sub('td.date').text().replace(/\t|\n/gi, '');
            const targetDate = new Date(date);
            targetDate.setHours(targetDate.getHours() + 9);
            if (startDate <= targetDate) {
                console.log(title);
                console.log(date);
                sectionNotice.push({
                    title: title,
                    url: url
                });
            } else break;
        }
        if (sectionNotice.length !== 0) {
            notice.push({
                'section': noticeNum[key],
                'data': sectionNotice
            });
        };
    }
    message(makeBlock(notice));
}

async function message(block) {
    const res = await axios.post('https://slack.com/api/chat.postMessage',
    {
        channel: 'C03U19KCXU7',
        blocks: block
    }, 
    {
        headers: {'Authorization': 'Bearer ' + token},
    }
    )
}

function makeBlock(notice) {
    const block = [];
    for (let i = 0; i < notice.length; i++) {
        block.push({
			"type": "header",
			"text": {
				"type": "plain_text",
				"text": `[${notice[i].section}]`,
				"emoji": true
			}
		})
        for (let j = 0; j < notice[i].data.length; j++) {
            block.push({
                "type": 'section',
                "text": {
                    "type": "mrkdwn",
                    "text": notice[i].data[j].title
                },
                "accessory": {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "Click Me",
                        "emoji": true
                    },
                    "value": "click_me_123",
                    "url": notice[i].data[j].url,
                    "action_id": "button-action"
                }
            })
        }
        block.push({
            "type": "divider"
        })
    }
    return block;
}

cron.schedule('*/5 * * * *', () => {
    console.log('------'+new Date() + '실행------');
    crawling();
})