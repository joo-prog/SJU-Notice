const axios = require('axios');
const cheerio = require('cheerio');
const dotenv = require('dotenv');

dotenv.config();

const noticeNum = {
    '333': '일반공지',
    '335': '학사',
    '337': '취업',
    '338': '장학'
};

module.exports = async function crawling () {
    const notice = [];
    let sectionNotice;
    for (let key in noticeNum){
        console.log(`-----[${noticeNum[key]}]-----`);
        const html = await axios.get(`http://board.sejong.ac.kr/boardlist.do?bbsConfigFK=${key}`);
        const $ = cheerio.load(html.data);
        const $noticeList = $('table>tbody>tr');
        sectionNotice = [];

        const date = new Date();
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setSeconds(0);
        endDate.setMilliseconds(0);
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
	        targetDate.setHours(targetDate.getHours()-9);
            if (startDate <= targetDate && targetDate <= endDate) {
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
    return makeBlock(notice);
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
                    "text": `${notice[i].data[j].title} (<${notice[i].data[j].url}|링크>)`
                },
                "accessory": {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "Remind",
                        "emoji": true
                    },
                    "value": `<${notice[i].data[j].url}|${notice[i].data[j].title}>`,
                    "action_id": "remind_click"
                }
            })
        }
        block.push({
            "type": "divider"
        })
    }
    return block;
}