/* Pattern 10 — 第 2 章：日常開口說（P11–P20）
 * 目標：日常對話最常用的 10 個框架——請求、點餐、必須、計畫、道謝道歉、提議、問地點、比較、持續多久、問資訊。
 * 全部自行編寫（不搬運任何教材原文）。寫法說明見 content.js 檔頭。
 */
(function (g) {
  'use strict';
  const P10 = g.P10;
  const T = P10.T, H = P10.H;

  /* 請求句的「也算對」：Could / Can / Would 都是禮貌請求，please 放句尾或 you 後面都可以。可以給多個說法 */
  const REQ = (...vps) => [].concat(...vps.map((vp) => ['{Could|Can|Would} you ' + vp + '{, please|}?', '{Could|Can|Would} you please ' + vp + '?']));

  /* 「這附近」的各種說法 */
  const NEARBY = '{near here|around here|nearby|close to here|close by|near this place|in this area|around this area|near this area}';
  /* 道謝／道歉：Thank you / Thanks，加 so much 也可以 */
  const THX = (...tails) => tails.map((tl) => '{Thank you|Thanks}{ so much|} for ' + tl + '.');
  /* 提議：How / What about …ing、How about we …、Why don't we …、Let's … 都是在提議。ing＝-ing 說法、base＝原形說法、tail＝句尾（含前面的空格） */
  const SUG = (ing, base, tail) => ['{How|What} about ' + ing + (tail || '') + '?', 'How about we ' + base + (tail || '') + '?', 'Why don\'t we ' + base + (tail || '') + '?', 'Let\'s ' + base + (tail || '') + '.'];

  const PATTERNS = [
    /* ================================================================ P11 */
    {
      id: 'P11', order: 11, title: '禮貌請求', label: 'Could you…?', short: 'Could you … , please?',
      mother: 'Could you open the window, please?',
      zh: '可以請你開一下窗戶嗎？',
      template: 'Could you [動作], please?',
      explain: '請別人幫忙，用 Could you ＋原形動詞，句尾加 please，語氣很客氣。could 要放在 you 前面；動詞前面不加 to，也不加 -ing。',
      contrast: [{ ok: 'Could you help me, please?', ng: 'Could you to help me, please?', note: 'Could you 後面直接接原形動詞' }],
      cloze: { A: [2], B: [0, 2, 4] },
      focus: 'GERUND_INFINITIVE',
      free: {
        prompts: ['用 Could you … , please? 請別人幫你一個小忙。', '想像你在辦公室或餐廳，請對方做一件事。'],
        examples: ['Could you turn off the air conditioner, please?', 'Could you show me the way, please?']
      },
      items: [
        T(1, '可以請你關門嗎？', 'Could you close the door, please?', REQ('{close|shut} the door'), 'GERUND_INFINITIVE'),
        T(1, '可以請你幫我一下嗎？', 'Could you help me, please?', REQ('{help me|give me a hand|help me out}'), 'GERUND_INFINITIVE'),
        T(1, '可以請你再說一次嗎？', 'Could you say that again, please?', REQ('{say that again|say it again|repeat that|repeat it|say that one more time|say it one more time}'), 'TENSE'),
        T(1, '可以請你說慢一點嗎？', 'Could you speak more slowly, please?', REQ('{speak|talk} {more slowly|slower|a little slower|a bit slower|a little more slowly|a bit more slowly|slowly}', 'slow down'), 'GERUND_INFINITIVE'),
        T(1, '可以請你把鹽遞給我嗎？', 'Could you pass me the salt, please?', REQ('{pass me the salt|pass the salt|hand me the salt|give me the salt|pass the salt to me|hand the salt to me}'), 'SUBJECT_VERB'),
        T(1, '可以請你關燈嗎？', 'Could you turn off the light, please?', REQ('{turn off|switch off} the {light|lights}', '{turn|switch} the {light|lights} off'), 'GERUND_INFINITIVE'),
        T(2, '可以請你借我一支筆嗎？', 'Could you lend me a pen, please?', REQ('{lend|give} me a pen', 'let me borrow a pen', '{lend|give} me your pen'), 'GERUND_INFINITIVE'),
        T(2, '可以請你載我去車站嗎？', 'Could you give me a ride to the station, please?', REQ('{give me a ride|give me a lift|drive me|take me} to the station'), 'TENSE'),
        T(2, '可以請你寄這封信嗎？', 'Could you send this letter, please?', REQ('{send|mail|post} {this|the} letter{ for me|}'), 'GERUND_INFINITIVE'),
        T(2, '可以請你等一下嗎？', 'Could you wait a moment, please?', REQ('wait {a moment|a minute|a second|a little|a while|for a moment|for a minute|for a second|here}', 'wait for me {a moment|a minute|a second|for a moment|for a minute|for a second}', 'give me {a moment|a minute|a second}'), 'GERUND_INFINITIVE'),
        T(2, '可以請你告訴我時間嗎？', 'Could you tell me the time, please?', REQ('{tell me the time|tell me what time it is|give me the time}'), 'SUBJECT_VERB'),
        T(2, '可以請你把音樂關小聲一點嗎？', 'Could you turn the music down, please?', REQ('turn {the music down|down the music}{ a little| a bit|}', 'keep the music down', 'lower the music'), 'TENSE', H),
        T(2, '可以請你幫我拍張照嗎？', 'Could you take a picture of me, please?', REQ('take {a picture|a photo|my picture|my photo|a picture of me|a photo of me|a picture for me|a photo for me|a picture of us|a photo of us|one picture|one photo}'), 'SUBJECT_VERB', H),
        T(3, '不好意思，可以請你幫我提這個袋子嗎？', 'Excuse me, could you carry this bag for me, please?', ['{Excuse me, |Sorry, |}{could|can|would} you {carry this bag{ for me|}|help me carry this bag|help me with this bag}{, please|}?', '{Excuse me, |Sorry, |}{could|can|would} you please {carry this bag{ for me|}|help me carry this bag|help me with this bag}?'], 'GERUND_INFINITIVE'),
        T(3, '可以請你明天早上打電話給我嗎？', 'Could you call me tomorrow morning, please?', REQ('{call me|phone me|ring me|give me a call} {tomorrow morning|in the morning tomorrow|tomorrow in the morning}'), 'GERUND_INFINITIVE'),
        T(3, '可以請你把這份文件寄給我嗎？', 'Could you send me this document, please?', REQ('{send me|email me} {this|the} {document|file}', '{send|email} {this|the} {document|file} to me'), 'TENSE'),
        T(3, '可以請你下班後幫我買牛奶嗎？', 'Could you buy some milk for me after work, please?', REQ('{buy|get} {some milk|milk} for me after work', '{buy me|get me} {some milk|milk} after work'), 'GERUND_INFINITIVE'),
        T(3, '可以請你在機場等我嗎？', 'Could you wait for me at the airport, please?', REQ('wait for me at the airport', 'wait at the airport for me'), 'GERUND_INFINITIVE'),
        T(3, '可以請你把這個箱子搬到樓上嗎？', 'Could you carry this box upstairs for me, please?', REQ('{carry|take|move} this box upstairs{ for me|}', 'help me {carry|move|take} this box upstairs'), 'TENSE'),
        T(3, '可以請你今天晚上幫我照顧小孩嗎？', 'Could you look after my kids tonight, please?', REQ('{look after|watch|take care of} {my kids|my children|the kids|the children|my kid|my child} {tonight|this evening}'), 'SUBJECT_VERB')
      ]
    },

    /* ================================================================ P12 */
    {
      id: 'P12', order: 12, title: '想要／點餐', label: 'I\'d like…', short: 'I\'d like … , please.',
      mother: 'I\'d like a cup of coffee, please.',
      zh: '我想要一杯咖啡。',
      template: 'I\'d like [名詞 / to ＋動作].',
      explain: '點餐、請求時，I\'d like（＝ I would like）比 I want 客氣。後面接名詞：I\'d like a coffee；接動作要加 to：I\'d like to book a table。',
      contrast: [{ ok: 'I\'d like to sit here.', ng: 'I\'d like sit here.', note: '接動作要加 to' }],
      cloze: { A: [1], B: [0, 1, 5] },
      focus: 'GERUND_INFINITIVE',
      free: {
        prompts: ['用 I\'d like … 點一樣東西，或說你想做的一件事。', '想像你在餐廳或飯店櫃台，用 I\'d like … 說出你想要的。'],
        examples: ['I\'d like a cup of hot tea, please.', 'I\'d like to change my seat, please.']
      },
      items: [
        T(1, '我想要一杯茶。', 'I\'d like a cup of tea, please.', ['I\'d like {a cup of tea|some tea|a tea|tea}{, please|}.'], 'PREPOSITION'),
        T(1, '我想要一杯水。', 'I\'d like a glass of water, please.', ['I\'d like {a glass of water|a cup of water|some water|water|a water}{, please|}.'], 'PREPOSITION'),
        T(1, '我想要一份菜單。', 'I\'d like a menu, please.', ['I\'d like {a menu|the menu|to see the menu|to see a menu|to have a menu|to look at the menu}{, please|}.'], 'GERUND_INFINITIVE'),
        T(1, '我想要一張兩個人的桌子。', 'I\'d like a table for two, please.', ['I\'d like a table for {two|two people|two persons}{, please|}.'], 'PREPOSITION'),
        T(1, '我想要一碗麵。', 'I\'d like a bowl of noodles, please.', ['I\'d like {a bowl of noodles|a plate of noodles|some noodles|noodles}{, please|}.'], 'PREPOSITION'),
        T(1, '我想要一張收據。', 'I\'d like a receipt, please.', ['I\'d like {a receipt|the receipt|my receipt|to get a receipt|to have a receipt}{, please|}.'], 'GERUND_INFINITIVE'),
        T(2, '我想要訂位。', 'I\'d like to book a table, please.', ['I\'d like to {book|reserve} a {table|seat}{, please|}.', 'I\'d like to make a reservation{, please|}.'], 'GERUND_INFINITIVE'),
        T(2, '我想要退房。', 'I\'d like to check out, please.', ['I\'d like to check out{ now| right now|}{, please|}.', 'I\'d like to check out of my room{, please|}.'], 'GERUND_INFINITIVE'),
        T(2, '我們想要靠窗的位子。', 'We\'d like a table by the window, please.', ['We\'d like {a table|a seat} {by|near|next to} the window{, please|}.', 'We\'d like a window {seat|table}{, please|}.'], 'PREPOSITION'),
        T(2, '我弟弟想要一杯果汁。', 'My brother would like a glass of juice, please.', ['My brother would like {a glass of juice|a cup of juice|some juice|juice}{, please|}.'], 'PREPOSITION'),
        T(2, '我們想要點菜了。', 'We\'d like to order now, please.', ['We\'d like to order{ now|}{, please|}.', 'We\'d like to {place our order|place an order|make our order}{ now|}{, please|}.'], 'GERUND_INFINITIVE'),
        T(2, '我想要退這件襯衫。', 'I\'d like to return this shirt, please.', ['I\'d like to {return|take back|bring back} {this|the} shirt{, please|}.'], 'GERUND_INFINITIVE', H),
        T(2, '他們想要兩杯咖啡。', 'They\'d like two cups of coffee, please.', ['They\'d like {two cups of coffee|two coffees}{, please|}.'], 'PREPOSITION', H),
        T(3, '我想要一份牛排和一杯水。', 'I\'d like a steak and a glass of water, please.', ['I\'d like a steak and {a glass of water|a cup of water|some water|water}{, please|}.'], 'PREPOSITION'),
        T(3, '我想要在這裡吃。', 'I\'d like to eat here, please.', ['I\'d like to {eat|dine|have it|have my meal|have my food} here{, please|}.', 'I\'d like to eat in{, please|}.'], 'GERUND_INFINITIVE'),
        T(3, '我想要訂星期五晚上兩個人的位子。', 'I\'d like to book a table for two on Friday night.', ['I\'d like to {book|reserve} a table for {two|two people} {on Friday night|for Friday night|on Friday evening|for Friday evening|on Friday}{, please|}.'], 'GERUND_INFINITIVE'),
        T(3, '我想要把這個包裹寄到台灣。', 'I\'d like to send this package to Taiwan.', ['I\'d like to {send|mail|ship} {this package|this parcel|the package|the parcel|this box} to Taiwan{, please|}.'], 'GERUND_INFINITIVE'),
        T(3, '我想要買兩張電影票。', 'I\'d like to buy two movie tickets.', ['I\'d like to {buy|get} {two movie tickets|two tickets for the movie|two tickets to the movie|two cinema tickets|two film tickets|two tickets|two tickets for a movie}{, please|}.', 'I\'d like {two movie tickets|two tickets}{, please|}.'], 'GERUND_INFINITIVE'),
        T(3, '我想要預約下週二的時間。', 'I\'d like to make an appointment for next Tuesday.', ['I\'d like to {make|book|schedule} an appointment {for|on} next Tuesday{, please|}.', 'I\'d like to {make|book|schedule} an appointment next Tuesday{, please|}.'], 'GERUND_INFINITIVE'),
        T(3, '我想要換一個大一點的房間。', 'I\'d like to change to a bigger room, please.', ['I\'d like to {change|switch|move} to a {bigger|larger} room{, please|}.', 'I\'d like {a|to get a} {bigger|larger} room{, please|}.', 'I\'d like to change my room to a bigger one{, please|}.'], 'GERUND_INFINITIVE')
      ]
    },

    /* ================================================================ P13 */
    {
      id: 'P13', order: 13, title: '必須', label: 'I have to…', short: 'I have to …',
      mother: 'I have to get up early tomorrow.',
      zh: '我明天必須早起。',
      template: 'I have to [動作].',
      explain: '「不得不做」用 have to ＋原形動詞；主詞是 he / she 用 has to，過去用 had to。「不必做」是 don\'t have to，不是 must not（那是「不可以」）。',
      contrast: [{ ok: 'She has to work today.', ng: 'She have to work today.', note: '主詞是 she，用 has to' }, { ok: 'I have to go now.', ng: 'I have go now.', note: 'have 後面的 to 不能漏' }],
      cloze: { A: [2], B: [1, 2, 3] },
      focus: 'WORD_MISSING',
      free: {
        prompts: ['用 I have to … 說一件你今天一定要做的事。', '說說明天有什麼事「不得不做」（用 have to / has to）。'],
        examples: ['I have to pick up my daughter at five.', 'My wife has to work this Saturday.']
      },
      items: [
        T(1, '我現在必須走了。', 'I have to go now.', ['I {have|need} to {go|leave}{ now| right now|}.', 'I must {go|leave}{ now| right now|}.', 'I have to get going{ now|}.'], 'WORD_MISSING'),
        T(1, '我今天必須工作。', 'I have to work today.', ['I {have|need} to work{ today|}.', 'I must work{ today|}.'], 'WORD_MISSING'),
        T(1, '我必須做功課。', 'I have to do my homework.', ['I {have|need} to {do|finish} {my homework|homework|my schoolwork}.', 'I must do my homework.'], 'GERUND_INFINITIVE'),
        T(1, '我必須打電話給我媽媽。', 'I have to call my mother.', ['I {have|need} to {call|phone} my {mother|mom}.', 'I must {call|phone} my {mother|mom}.'], 'WORD_MISSING'),
        T(1, '我必須去銀行。', 'I have to go to the bank.', ['I {have|need} to {go to|visit|stop by|go by} the bank.', 'I {have|need} to go to a bank.', 'I must go to the bank.'], 'GERUND_INFINITIVE'),
        T(1, '我必須買牛奶。', 'I have to buy some milk.', ['I {have|need} to {buy|get} {some milk|milk}.', 'I must {buy|get} {some milk|milk}.'], 'WORD_MISSING'),
        T(2, '她今天必須加班。', 'She has to work late today.', ['She {has|needs} to {work late|work overtime|stay late at work}{ today|}.', 'She must {work late|work overtime|stay late at work}{ today|}.', 'She {has|needs} to work late tonight.'], 'SUBJECT_VERB'),
        T(2, '他明天必須早起。', 'He has to get up early tomorrow.', ['He {has|needs} to {get up|wake up} {early|earlier} tomorrow.', 'Tomorrow he {has|needs} to {get up|wake up} {early|earlier}.', 'He must {get up|wake up} {early|earlier} tomorrow.'], 'SUBJECT_VERB'),
        T(2, '我們必須在六點前到那裡。', 'We have to be there by six.', ['We {have|need} to {be there|get there|arrive|arrive there} {by|before} six.', 'We must {be there|get there|arrive} {by|before} six.', 'We have to {be|get} there at six.'], 'WORD_MISSING'),
        T(2, '他們必須付現金。', 'They have to pay in cash.', ['They {have|need} to pay {in cash|cash|with cash}.', 'They must pay {in cash|cash|with cash}.'], 'GERUND_INFINITIVE'),
        T(2, '我明天不用上班。', 'I don\'t have to work tomorrow.', ['I {don\'t|do not} {have|need} to {work|go to work} tomorrow.', 'Tomorrow I {don\'t|do not} {have|need} to {work|go to work}.'], 'AUXILIARY'),
        T(2, '你不必等我。', 'You don\'t have to wait for me.', ['You {don\'t|do not} {have|need} to wait{ for me|}.'], 'AUXILIARY', H),
        T(2, '她不必付錢。', 'She doesn\'t have to pay.', ['She {doesn\'t|does not} {have|need} to pay{ anything|}.'], 'AUXILIARY', H),
        T(3, '我必須在明天以前寄出報告。', 'I have to send the report by tomorrow.', ['I {have|need} to {send|email|submit} {the report|my report|a report} {by|before} tomorrow.', 'I must {send|email|submit} {the report|my report} {by|before} tomorrow.'], 'WORD_MISSING'),
        T(3, '我們明天早上必須很早出門。', 'We have to leave very early tomorrow morning.', ['We {have|need} to {leave|go out|head out|set off} {very |really |so |}early tomorrow morning.', 'We {have|need} to {leave|go out} {home|the house} {very |really |}early tomorrow morning.', 'We must leave {very |really |}early tomorrow morning.', 'Tomorrow morning we {have|need} to {leave|go out} {very |really |}early.'], 'WORD_MISSING'),
        T(3, '她星期六必須帶狗去看醫生。', 'She has to take her dog to the doctor on Saturday.', ['She {has|needs} to take {her dog|the dog} to the {doctor|vet} {on|this} Saturday.', 'On Saturday she {has|needs} to take her dog to the {doctor|vet}.', 'She must take her dog to the {doctor|vet} on Saturday.'], 'SUBJECT_VERB'),
        T(3, '我下個月必須搬家。', 'I have to move next month.', ['I {have|need} to {move|move out|move house} next month.', 'Next month I {have|need} to {move|move out|move house}.', 'I must move next month.'], 'WORD_MISSING'),
        T(3, '他們昨天必須加班。', 'They had to work late yesterday.', ['They had to {work late|work overtime|stay late at work} yesterday.', 'Yesterday they had to {work late|work overtime|stay late at work}.'], 'TENSE'),
        T(3, '我必須先把工作做完。', 'I have to finish my work first.', ['I {have|need} to {finish|complete} {my work|the work|my job} first.', 'I must {finish|complete} {my work|the work|my job} first.', 'First, I {have|need} to {finish|complete} {my work|the work|my job}.'], 'GERUND_INFINITIVE'),
        T(3, '我必須在十點以前回家。', 'I have to be home by ten.', ['I {have|need} to {be home|be at home|get home|be back home|come home|go home|be back} {by|before} ten.', 'I must {be home|get home|go home|come home} {by|before} ten.', 'I have to be home at ten.'], 'WORD_MISSING')
      ]
    },

    /* ================================================================ P14 */
    {
      id: 'P14', order: 14, title: '計畫', label: 'I\'m going to…', short: 'I\'m going to …',
      mother: 'I\'m going to meet my friends this weekend.',
      zh: '我這個週末要跟朋友見面。',
      template: 'I\'m going to [動作].',
      explain: '說「打算、已經決定要做」用 be going to ＋原形動詞。be 動詞要跟著主詞變（I\'m / he\'s / they\'re）。不打算做，就說 I\'m not going to …。',
      contrast: [{ ok: 'I\'m going to visit my aunt.', ng: 'I going to visit my aunt.', note: 'going to 前面要有 be 動詞' }, { ok: 'He is going to cook.', ng: 'He is going to cooking.', note: 'to 後面接原形動詞' }],
      cloze: { A: [1], B: [0, 1, 3] },
      focus: 'AUXILIARY',
      free: {
        prompts: ['用 I\'m going to … 說說你這個週末的計畫。', '說一件你「已經決定下個月要做」的事。'],
        examples: ['I\'m going to cook dinner for my family tonight.', 'We\'re going to visit my parents on Sunday.']
      },
      items: [
        T(1, '我今天晚上要煮晚餐。', 'I\'m going to cook dinner tonight.', ['I am going to {cook|make} {dinner|supper} {tonight|this evening}.', 'Tonight I am going to {cook|make} {dinner|supper}.'], 'AUXILIARY'),
        T(1, '我要買一台新電腦。', 'I\'m going to buy a new computer.', ['I am going to {buy|get} a new computer.'], 'AUXILIARY'),
        T(1, '我要打電話給我朋友。', 'I\'m going to call my friend.', ['I am going to {call|phone} {my friend|a friend|my friends}.'], 'GERUND_INFINITIVE'),
        T(1, '我要洗車。', 'I\'m going to wash my car.', ['I am going to {wash|clean} {my car|the car}.'], 'GERUND_INFINITIVE'),
        T(1, '我要早點睡。', 'I\'m going to go to bed early.', ['I am going to {go to bed|go to sleep|sleep|turn in} {early|earlier}.', 'I am going to bed early.'], 'WORD_MISSING'),
        T(1, '我要學游泳。', 'I\'m going to learn to swim.', ['I am going to {learn to swim|learn how to swim|learn swimming|take swimming lessons|take a swimming class}.'], 'WORD_MISSING'),
        T(2, '他這個週末要去爬山。', 'He is going to go hiking this weekend.', ['He is going to {go hiking|go climbing|hike|climb a mountain|climb mountains} this weekend.', 'This weekend he is going to {go hiking|go climbing|hike|climb a mountain}.'], 'AUXILIARY'),
        T(2, '我們下個月要結婚。', 'We are going to get married next month.', ['Next month we are going to get married.', 'We are going to {have our wedding|have a wedding} next month.'], 'AUXILIARY'),
        T(2, '他們要搬到台北。', 'They are going to move to Taipei.', ['They are going to {move|move over} to Taipei.'], 'AUXILIARY'),
        T(2, '我女兒明天要考試。', 'My daughter is going to have a test tomorrow.', ['My daughter is going to {have|take} {a test|an exam} tomorrow.', 'Tomorrow my daughter is going to {have|take} {a test|an exam}.'], 'AUXILIARY'),
        T(2, '我不打算買那件外套。', 'I\'m not going to buy that coat.', ['I am not going to {buy|get} {that|the} {coat|jacket}.'], 'AUXILIARY'),
        T(2, '我們不打算看電影。', 'We\'re not going to watch a movie.', ['We are not going to {watch|see} a {movie|film}.', 'We are not going to {the movies|the cinema}.'], 'GERUND_INFINITIVE', H),
        T(2, '她不打算接那通電話。', 'She is not going to answer the phone.', ['She is not going to {answer|pick up|take} {the phone|that call|the call|that phone call|the phone call}.'], 'AUXILIARY', H),
        T(3, '我下個月要去日本旅行。', 'I\'m going to travel to Japan next month.', ['I am going to {travel to|visit|go to|take a trip to|go on a trip to} Japan next month.', 'Next month I am going to {travel to|visit|go to|take a trip to} Japan.', 'I am going to Japan next month.'], 'AUXILIARY'),
        T(3, '我明天早上要去跑步。', 'I\'m going to go for a run tomorrow morning.', ['I am going to {go for a run|go running|run|go jogging|jog|go for a jog} tomorrow morning.', 'Tomorrow morning I am going to {go for a run|go running|run|go jogging|jog|go for a jog}.'], 'WORD_MISSING'),
        T(3, '我們今天晚上要在家吃飯。', 'We\'re going to eat at home tonight.', ['We are going to {eat|have dinner|eat dinner|have supper|eat supper} at home {tonight|this evening}.', 'Tonight we are going to {eat|have dinner|eat dinner} at home.'], 'AUXILIARY'),
        T(3, '我下午要去買東西。', 'I\'m going to go shopping this afternoon.', ['I am going to {go shopping|shop} {this afternoon|in the afternoon}.', 'I am going shopping {this afternoon|in the afternoon}.', 'This afternoon I am going to {go shopping|shop}.'], 'GERUND_INFINITIVE'),
        T(3, '我們這個週末要去露營。', 'We\'re going to go camping this weekend.', ['We are going to {go camping|camp} this weekend.', 'This weekend we are going to {go camping|camp}.', 'We are going camping this weekend.'], 'WORD_MISSING'),
        T(3, '他明年要開一間咖啡店。', 'He is going to open a coffee shop next year.', ['He is going to {open|start} a {coffee shop|cafe|coffee store} next year.', 'Next year he is going to {open|start} a {coffee shop|cafe|coffee store}.'], 'AUXILIARY'),
        T(3, '我今年要多存一點錢。', 'I\'m going to save more money this year.', ['I am going to save {more money|more|some more money|up more money} this year.', 'This year I am going to save {more money|more|some more money|up more money}.'], 'GERUND_INFINITIVE')
      ]
    },

    /* ================================================================ P15 */
    {
      id: 'P15', order: 15, title: '道謝與道歉', label: 'Thank you for…', short: 'Thank you for …ing',
      mother: 'Thank you for helping me.',
      zh: '謝謝你幫我。',
      template: 'Thank you for [V-ing / 名詞].',
      explain: 'for 是介系詞，後面接名詞或 -ing（Thank you for helping）。不接原形動詞，也不接 to。道歉也一樣：Sorry for being late。',
      contrast: [{ ok: 'Thank you for coming.', ng: 'Thank you for come.', note: 'for 後面接 -ing' }, { ok: 'Sorry for being late.', ng: 'Sorry for late.', note: '形容詞前面加 being' }],
      cloze: { A: [3], B: [0, 2, 3] },
      focus: 'GERUND_INFINITIVE',
      free: {
        prompts: ['用 Thank you for … 謝謝別人為你做的一件事。', '用 Sorry for … 為一件小事道歉。'],
        examples: ['Thank you for cooking dinner tonight.', 'Sorry for making so much noise last night.']
      },
      items: [
        T(1, '謝謝你來。', 'Thank you for coming.', THX('{coming|coming here|coming today|coming over|being here}'), 'GERUND_INFINITIVE'),
        T(1, '謝謝你等我。', 'Thank you for waiting.', THX('waiting{ for me|}'), 'GERUND_INFINITIVE'),
        T(1, '謝謝你打電話給我。', 'Thank you for calling me.', THX('{calling me|calling|phoning me}'), 'GERUND_INFINITIVE'),
        T(1, '謝謝你聽我說。', 'Thank you for listening to me.', THX('{listening to me|listening|hearing me out}'), 'GERUND_INFINITIVE'),
        T(1, '謝謝你告訴我。', 'Thank you for telling me.', THX('{telling me|letting me know|telling me that|telling me this|telling me about it}'), 'TENSE'),
        T(1, '謝謝你載我。', 'Thank you for driving me.', THX('{driving me|giving me a ride|giving me a lift|taking me|driving me here|driving me home|picking me up}'), 'GERUND_INFINITIVE'),
        T(2, '謝謝你的邀請。', 'Thank you for your invitation.', THX('{your invitation|the invitation|inviting me|inviting us}'), 'PREPOSITION'),
        T(2, '謝謝你送我禮物。', 'Thank you for giving me a gift.', THX('{giving me a gift|giving me a present|the gift|the present|your gift|your present|sending me a gift|sending me a present|buying me a gift|buying me a present|getting me a gift|getting me a present}'), 'GERUND_INFINITIVE'),
        T(2, '謝謝你們邀請我吃晚餐。', 'Thank you for inviting me to dinner.', THX('{inviting me to dinner|inviting me for dinner|having me for dinner|having me over for dinner|inviting me over for dinner|inviting me over}'), 'PREPOSITION'),
        T(2, '她謝謝我幫忙。', 'She thanked me for helping her.', ['She thanked me for {helping her|helping|my help}.'], 'GERUND_INFINITIVE'),
        T(2, '對不起，我遲到了。', 'Sorry for being late.', ['{Sorry|I am sorry} for being late.', '{Sorry|I am sorry} I am late.', 'Sorry, I am late.'], 'WORD_MISSING'),
        T(2, '對不起，讓你等這麼久。', 'Sorry for keeping you waiting so long.', ['{Sorry|I am sorry} for {keeping you waiting|making you wait}{ so long| for so long|}.', '{Sorry|I am sorry} to keep you waiting{ so long|}.'], 'GERUND_INFINITIVE', H),
        T(2, '對不起，吵到你了。', 'Sorry for waking you up.', ['{Sorry|I am sorry} for {waking you up|waking you|disturbing you|bothering you}.'], 'GERUND_INFINITIVE', H),
        T(3, '謝謝你昨天幫我搬家。', 'Thank you for helping me move yesterday.', THX('helping me {move|move house|move out|with the move|with my move} yesterday'), 'GERUND_INFINITIVE'),
        T(3, '謝謝你今天這麼早來接我。', 'Thank you for picking me up so early today.', THX('{picking me up|coming to pick me up} {so early|this early}{ today|}'), 'GERUND_INFINITIVE'),
        T(3, '對不起，我忘了打電話給你。', 'Sorry for forgetting to call you.', ['{Sorry|I am sorry} for {forgetting to call you|not calling you|forgetting to phone you|forgetting to call}.'], 'GERUND_INFINITIVE'),
        T(3, '謝謝你們照顧我的孩子。', 'Thank you for taking care of my children.', THX('{taking care of|looking after|watching} {my children|my kids|my child|my kid|the kids|the children}'), 'GERUND_INFINITIVE'),
        T(3, '對不起，剛才打斷你。', 'Sorry for interrupting you.', ['{Sorry|I am sorry} for {interrupting you|interrupting|cutting you off|cutting in}.'], 'GERUND_INFINITIVE'),
        T(3, '謝謝你一直陪著我。', 'Thank you for always being there for me.', THX('{always being there for me|being there for me|always being with me|always staying with me|staying with me|always supporting me|supporting me|always being by my side|being by my side}'), 'WORD_MISSING'),
        T(3, '謝謝你這麼快回覆我。', 'Thank you for replying so quickly.', THX('{replying|answering|responding}{ to me|} {so quickly|so fast|so soon|this quickly|this fast|this soon}', 'getting back to me {so quickly|so fast|so soon|this quickly|this fast|this soon}'), 'GERUND_INFINITIVE')
      ]
    },

    /* ================================================================ P16 */
    {
      id: 'P16', order: 16, title: '提議', label: 'How about…?', short: 'How about …ing?',
      mother: 'How about going to the movies tonight?',
      zh: '今天晚上去看電影怎麼樣？',
      template: 'How about [V-ing / 名詞]?',
      explain: '提出建議用 How about ＋ -ing 或名詞（How about going?）。about 是介系詞，後面不接原形動詞，也不加 to。也可以說 How about we go …?',
      contrast: [{ ok: 'How about eating out?', ng: 'How about eat out?', note: 'about 後面接 -ing' }, { ok: 'How about going home?', ng: 'How about to go home?', note: 'about 後面不加 to' }],
      cloze: { A: [2], B: [1, 2, 5] },
      focus: 'GERUND_INFINITIVE',
      free: {
        prompts: ['用 How about … ? 向朋友提一個週末活動的建議。', '想不到辦法時，用 How about … ? 提一個點子。'],
        examples: ['How about having lunch together tomorrow?', 'How about asking your teacher?']
      },
      items: [
        T(1, '吃麵怎麼樣？', 'How about eating noodles?', SUG('{eating noodles|having noodles|getting noodles|noodles}', '{eat noodles|have noodles|get noodles}'), 'GERUND_INFINITIVE'),
        T(1, '去公園散步怎麼樣？', 'How about going for a walk in the park?', SUG('{going for a walk in the park|taking a walk in the park|walking in the park|going for a walk|taking a walk|going to the park|the park}', '{go for a walk in the park|take a walk in the park|walk in the park|go for a walk|take a walk|go to the park}'), 'GERUND_INFINITIVE'),
        T(1, '明天去爬山怎麼樣？', 'How about going hiking tomorrow?', SUG('{going hiking|going climbing|hiking|climbing a mountain}', '{go hiking|go climbing|hike|climb a mountain}', ' tomorrow'), 'GERUND_INFINITIVE'),
        T(1, '喝杯咖啡怎麼樣？', 'How about having a cup of coffee?', SUG('{having a cup of coffee|having a coffee|having some coffee|drinking coffee|drinking a cup of coffee|getting a coffee|getting some coffee|grabbing a coffee|a cup of coffee|coffee}', '{have a cup of coffee|have a coffee|have some coffee|drink coffee|get a coffee|get some coffee|grab a coffee}'), 'GERUND_INFINITIVE'),
        T(1, '先休息一下怎麼樣？', 'How about taking a break?', SUG('{taking a break|taking a rest|having a rest|having a break|taking a short break|resting|resting for a while|a break}', '{take a break|take a rest|have a rest|have a break|take a short break|rest|rest for a while}'), 'GERUND_INFINITIVE'),
        T(1, '在家看電視怎麼樣？', 'How about watching TV at home?', SUG('{watching TV at home|watching television at home|staying home and watching TV|staying at home and watching TV|watching TV|watching television|staying home|staying at home|staying in}', '{watch TV at home|watch television at home|stay home and watch TV|stay at home and watch TV|watch TV|watch television|stay home|stay at home|stay in}'), 'GERUND_INFINITIVE'),
        T(2, '坐計程車怎麼樣？', 'How about taking a taxi?', SUG('{taking a taxi|taking a cab|going by taxi|going by cab|a taxi|a cab}', '{take a taxi|take a cab|go by taxi|go by cab}'), 'GERUND_INFINITIVE'),
        T(2, '我們一起煮晚餐怎麼樣？', 'How about cooking dinner together?', SUG('{cooking dinner together|making dinner together|cooking together|making dinner|cooking dinner|cooking supper together|making supper together}', '{cook dinner together|make dinner together|cook together|make dinner|cook dinner|cook supper together|make supper together}'), 'SUBJECT_VERB'),
        T(2, '我們搭公車怎麼樣？', 'How about taking the bus?', SUG('{taking the bus|taking a bus|going by bus|riding the bus|the bus|a bus}', '{take the bus|take a bus|go by bus|ride the bus}'), 'GERUND_INFINITIVE'),
        T(2, '問問老師怎麼樣？', 'How about asking the teacher?', SUG('{asking the teacher|asking your teacher|asking our teacher|asking my teacher|the teacher}', '{ask the teacher|ask your teacher|ask our teacher|ask my teacher}'), 'GERUND_INFINITIVE'),
        T(2, '下週再見面怎麼樣？', 'How about meeting next week?', SUG('{meeting next week|meeting up next week|seeing each other next week|getting together next week|next week}', '{meet next week|meet up next week|see each other next week|get together next week}'), 'GERUND_INFINITIVE'),
        T(2, '先吃點東西怎麼樣？', 'How about eating something first?', SUG('{eating something first|having something to eat first|getting something to eat first|eating first|having something first|grabbing something to eat first}', '{eat something first|have something to eat first|get something to eat first|eat first|have something first|grab something to eat first}'), 'GERUND_INFINITIVE', H),
        T(2, '我們走路去怎麼樣？', 'How about walking there?', SUG('{walking there|walking|going there on foot|going on foot}', '{walk there|walk|go there on foot|go on foot}'), 'TENSE', H),
        T(3, '這個週末去海邊怎麼樣？', 'How about going to the beach this weekend?', SUG('{going to the beach|going to the seaside|going to the sea|the beach}', '{go to the beach|go to the seaside|go to the sea}', ' this weekend'), 'GERUND_INFINITIVE'),
        T(3, '晚上一起看一部電影怎麼樣？', 'How about watching a movie together tonight?', SUG('{watching|seeing} a {movie|film}{ together|}', '{watch|see} a {movie|film}{ together|}', ' tonight'), 'GERUND_INFINITIVE'),
        T(3, '下班後去喝一杯怎麼樣？', 'How about getting a drink after work?', SUG('{getting a drink|having a drink|going for a drink|going out for a drink|grabbing a drink|getting drinks|having drinks|grabbing drinks}', '{get a drink|have a drink|go for a drink|go out for a drink|grab a drink|get drinks|have drinks|grab drinks}', ' after work'), 'GERUND_INFINITIVE'),
        T(3, '明天早上早一點出發怎麼樣？', 'How about leaving earlier tomorrow morning?', SUG('{leaving|starting|setting off|going}{ a little| a bit|} {earlier|early}', '{leave|start|set off|go}{ a little| a bit|} {earlier|early}', ' tomorrow morning'), 'GERUND_INFINITIVE'),
        T(3, '週末我們去看奶奶怎麼樣？', 'How about visiting Grandma this weekend?', SUG('{visiting|seeing|going to see|going to visit} {Grandma|our grandma|my grandma|our grandmother|my grandmother|grandmother}', '{visit|see|go see|go visit} {Grandma|our grandma|my grandma|our grandmother|my grandmother|grandmother}', ' this weekend'), 'GERUND_INFINITIVE'),
        T(3, '我們把會議改到下午怎麼樣？', 'How about moving the meeting to the afternoon?', SUG('{moving the meeting to the afternoon|changing the meeting to the afternoon|moving the meeting to this afternoon|having the meeting in the afternoon|holding the meeting in the afternoon}', '{move the meeting to the afternoon|change the meeting to the afternoon|move the meeting to this afternoon|have the meeting in the afternoon|hold the meeting in the afternoon}'), 'GERUND_INFINITIVE'),
        T(3, '我們先看一下菜單怎麼樣？', 'How about looking at the menu first?', SUG('{looking at|checking|reading|having a look at|taking a look at} the menu{ first|}', '{look at|check|read|have a look at|take a look at} the menu{ first|}'), 'GERUND_INFINITIVE')
      ]
    },

    /* ================================================================ P17 */
    {
      id: 'P17', order: 17, title: '問地點、問有沒有', label: 'Is there…?', short: 'Is there a … near here?',
      mother: 'Is there a bank near here?',
      zh: '這附近有銀行嗎？',
      template: 'Is there a [地點] near here?',
      explain: '問「有沒有」用 Is there（一個）或 Are there（很多個），不是 Have。there 當主詞：Is there a bank near here? 回答：Yes, there is. / No, there isn\'t.',
      contrast: [{ ok: 'Is there a bank near here?', ng: 'Have a bank near here?', note: '「有沒有」不是 have' }, { ok: 'Are there any shops?', ng: 'Is there two shops?', note: '兩個以上用 Are there' }],
      cloze: { A: [0], B: [0, 3, 4] },
      focus: 'AUXILIARY',
      free: {
        prompts: ['用 Is there … ? 問一個你想找的地方。', '用 There is / There are … 說說你家附近有什麼。'],
        examples: ['Is there a bus stop near the hotel?', 'There are two parks near my house.']
      },
      items: [
        T(1, '這附近有書店嗎？', 'Is there a bookstore near here?', ['Is there a {bookstore|book store|bookshop} ' + NEARBY + '?'], 'AUXILIARY'),
        T(1, '這附近有醫院嗎？', 'Is there a hospital near here?', ['Is there a hospital ' + NEARBY + '?'], 'AUXILIARY'),
        T(1, '這附近有公園嗎？', 'Is there a park near here?', ['Is there a park ' + NEARBY + '?'], 'AUXILIARY'),
        T(1, '這附近有超市嗎？', 'Is there a supermarket near here?', ['Is there a {supermarket|grocery store|grocery|market} ' + NEARBY + '?'], 'AUXILIARY'),
        T(1, '這附近有飯店嗎？', 'Is there a hotel near here?', ['Is there a hotel ' + NEARBY + '?'], 'AUXILIARY'),
        T(1, '這附近有廁所嗎？', 'Is there a restroom near here?', ['Is there a {restroom|bathroom|toilet|washroom|public restroom|public toilet|public bathroom} ' + NEARBY + '?'], 'AUXILIARY'),
        T(2, '這附近有餐廳嗎？', 'Are there any restaurants near here?', ['Are there {any |}restaurants ' + NEARBY + '?', 'Is there a restaurant ' + NEARBY + '?'], 'SUBJECT_VERB'),
        T(2, '這附近有便宜的旅館嗎？', 'Are there any cheap hotels near here?', ['Are there {any |}cheap hotels ' + NEARBY + '?', 'Is there a cheap hotel ' + NEARBY + '?'], 'SUBJECT_VERB'),
        T(2, '這附近沒有銀行。', 'There isn\'t a bank near here.', ['There is not {a|any} bank ' + NEARBY + '.', 'There is no bank ' + NEARBY + '.', 'There are no banks ' + NEARBY + '.', 'There are not any banks ' + NEARBY + '.'], 'AUXILIARY'),
        T(2, '學校旁邊有一家咖啡店。', 'There is a coffee shop next to the school.', ['There is a {coffee shop|cafe|coffee store} {next to|beside|near|by|next door to} the school.'], 'AUXILIARY'),
        T(2, '那條街上有很多商店。', 'There are many shops on that street.', ['There are {many|a lot of|lots of} {shops|stores} on {that|the} street.'], 'SUBJECT_VERB'),
        T(2, '附近有一個大公園。', 'There is a big park nearby.', ['There is a {big|large|huge} park ' + NEARBY + '.'], 'AUXILIARY', H),
        T(2, '這個城市裡有很多漂亮的地方。', 'There are many beautiful places in this city.', ['There are {many|a lot of|lots of|plenty of} {beautiful|nice|lovely|pretty} {places|spots} in {this city|the city|this town|town}.'], 'SUBJECT_VERB', H),
        T(3, '昨天晚上電影院有很多人嗎？', 'Were there many people at the cinema last night?', ['Were there {many people|a lot of people|lots of people} {at|in} the {cinema|movie theater|theater|movies} {last night|yesterday evening}?'], 'SUBJECT_VERB'),
        T(3, '你家附近有車站嗎？', 'Is there a station near your house?', ['Is there {a|a train|a bus|a subway|a metro|an MRT} station {near|around|close to} {your house|your home|your place|your apartment|where you live}?'], 'AUXILIARY'),
        T(3, '這間飯店裡有游泳池嗎？', 'Is there a swimming pool in this hotel?', ['Is there a {swimming pool|pool} {in|at} {this hotel|the hotel}?'], 'AUXILIARY'),
        T(3, '桌子上有兩杯咖啡。', 'There are two cups of coffee on the table.', ['There are {two cups of coffee|two coffees} on the {table|desk}.'], 'SUBJECT_VERB'),
        T(3, '房間裡沒有人。', 'There is nobody in the room.', ['There is {nobody|no one} in the {room|house}.', 'There is not {anyone|anybody} in the {room|house}.'], 'AUXILIARY'),
        T(3, '這附近有沒有賣水果的店？', 'Is there a store that sells fruit near here?', ['Is there a {store|shop|place|stand} {that sells|which sells|selling} fruit ' + NEARBY + '?', 'Is there a fruit {store|shop|stand} ' + NEARBY + '?'], 'AUXILIARY'),
        T(3, '你的公司附近有好吃的餐廳嗎？', 'Are there any good restaurants near your office?', ['Are there {any |}{good|nice|delicious|tasty} {restaurants|places to eat} {near|around|close to} {your office|your company|where you work}?', 'Is there a {good|nice|delicious|tasty} {restaurant|place to eat} {near|around|close to} {your office|your company|where you work}?'], 'SUBJECT_VERB')
      ]
    },

    /* ================================================================ P18 */
    {
      id: 'P18', order: 18, title: '比較', label: 'cheaper than…', short: 'A is cheaper than B',
      mother: 'This one is cheaper than that one.',
      zh: '這個比那個便宜。',
      template: 'A is [比較級] than B.',
      explain: '比較兩個東西：短的形容詞加 -er（cheaper），長的用 more（more expensive），後面接 than。兩種不能混用：不是 more cheaper，也不是 cheaper then。',
      contrast: [{ ok: 'This one is cheaper than that one.', ng: 'This one is more cheaper than that one.', note: 'more 和 -er 不能一起用' }, { ok: 'It is bigger than mine.', ng: 'It is bigger then mine.', note: '比較用 than' }],
      cloze: { A: [3], B: [3, 4, 5] },
      focus: 'COMPARATIVE',
      free: {
        prompts: ['比較你家兩樣東西：哪個比較大、比較舊、比較貴？', '用 -er … than 或 more … than 比較兩個地方或兩個人。'],
        examples: ['My bag is heavier than yours.', 'This road is more crowded than that one.']
      },
      items: [
        T(1, '這件外套比那件貴。', 'This coat is more expensive than that one.', ['This {coat|jacket} is more expensive than {that one|that coat|that jacket}.'], 'COMPARATIVE'),
        T(1, '這家店比那家便宜。', 'This store is cheaper than that one.', ['This {store|shop} is cheaper than {that one|that store|that shop}.'], 'COMPARATIVE'),
        T(1, '我的房間比你的大。', 'My room is bigger than yours.', ['My room is bigger than {yours|your room|your one}.'], 'COMPARATIVE'),
        T(1, '今天比昨天冷。', 'It is colder today than yesterday.', ['Today is colder than yesterday.', 'It is colder today than it was yesterday.', 'Today is colder than it was yesterday.'], 'COMPARATIVE'),
        T(1, '火車比公車快。', 'The train is faster than the bus.', ['The train is {faster|quicker} than {the bus|a bus}.', 'Trains are {faster|quicker} than buses.', 'A train is {faster|quicker} than a bus.'], 'COMPARATIVE'),
        T(1, '我哥哥比我高。', 'My brother is taller than me.', ['My {brother|older brother|big brother} is taller than {me|I|I am}.'], 'COMPARATIVE'),
        T(2, '這本書比那本有趣。', 'This book is more interesting than that one.', ['This book is more interesting than {that one|that book}.'], 'COMPARATIVE'),
        T(2, '她比她姐姐年輕。', 'She is younger than her sister.', ['She is younger than her {sister|older sister|big sister}.'], 'COMPARATIVE'),
        T(2, '這個問題比那個簡單。', 'This question is easier than that one.', ['This {question|problem} is easier than {that one|that question|that problem}.'], 'COMPARATIVE'),
        T(2, '這家餐廳比那家安靜。', 'This restaurant is quieter than that one.', ['This {restaurant|place} is quieter than {that one|that restaurant|that place}.'], 'COMPARATIVE'),
        T(2, '我的手機比你的新。', 'My phone is newer than yours.', ['My {phone|cell phone|cellphone|mobile phone|mobile|smartphone} is newer than {yours|your phone|your cell phone|your cellphone|your mobile phone|your mobile|your smartphone}.'], 'COMPARATIVE'),
        T(2, '她跑得比我快。', 'She runs faster than me.', ['She runs {faster|quicker} than {me|I|I do}.'], 'COMPARATIVE', H),
        T(2, '我今天比昨天累。', 'I am more tired today than yesterday.', ['I am more tired today than {I was |}yesterday.', 'Today I am more tired than {I was |}yesterday.', 'I am more tired than {I was |}yesterday.'], 'COMPARATIVE', H),
        T(3, '這支手機比那支貴很多。', 'This phone is much more expensive than that one.', ['This {phone|cell phone|cellphone|mobile phone|mobile|smartphone} is {much|a lot|far|way|so much} more expensive than {that one|that phone|that cell phone|that cellphone|that mobile phone|that mobile|that smartphone}.'], 'COMPARATIVE'),
        T(3, '台北比高雄涼快一點。', 'Taipei is a little cooler than Kaohsiung.', ['Taipei is {a little|a bit|slightly|a little bit} cooler than Kaohsiung.'], 'COMPARATIVE'),
        T(3, '搭火車比開車便宜很多。', 'Taking the train is much cheaper than driving.', ['{Taking the train|Going by train|Riding the train|Traveling by train} is {much|a lot|far|way} cheaper than {driving|going by car|taking a car|traveling by car|driving a car}.'], 'COMPARATIVE'),
        T(3, '我今年比去年忙。', 'I am busier this year than last year.', ['I am busier this year than {I was |}last year.', 'This year I am busier than {I was |}last year.', 'I am busier than {I was |}last year.'], 'COMPARATIVE'),
        T(3, '他的中文比我的英文好。', 'His Chinese is better than my English.', ['His Chinese is better than my English is.'], 'COMPARATIVE'),
        T(3, '住在鄉下比住在城市安靜。', 'Living in the countryside is quieter than living in the city.', ['{Living|Life} in the {countryside|country} is quieter than {living|life} in {the|a} city.'], 'COMPARATIVE'),
        T(3, '今天的會議比我想的短。', "Today's meeting was shorter than I thought.", ["{Today's|The} meeting {was|is} shorter than I {thought|expected|had thought|had expected}.", "The meeting today was shorter than I {thought|expected|had thought|had expected}."], 'COMPARATIVE')
      ]
    },

    /* ================================================================ P19 */
    {
      id: 'P19', order: 19, title: '持續多久（for / since）', label: 'I\'ve lived here for…', short: 'I\'ve … for / since …',
      mother: 'I\'ve lived here for five years.',
      zh: '我住在這裡五年了。',
      template: 'I have [過去分詞] for / since …',
      explain: '「從以前一直到現在」用現在完成式 have ＋過去分詞。for 接一段時間（for five years），since 接起點（since 2019）。不能用現在式：I live here for …',
      contrast: [{ ok: 'I have lived here for two years.', ng: 'I live here for two years.', note: '持續到現在，用 have ＋過去分詞' }, { ok: 'I have lived here since 2019.', ng: 'I have lived here for 2019.', note: '起點要用 since' }],
      cloze: { A: [3], B: [0, 1, 3] },
      focus: 'TENSE',
      free: {
        prompts: ['用 for 或 since 說說：你做某件事做了多久。', '說一件「從某個時間點開始，到現在還在」的事。'],
        examples: ['I have studied English for two years.', 'My brother has worked here since 2020.']
      },
      items: [
        T(1, '我在這家公司工作兩年了。', 'I\'ve worked at this company for two years.', ['I have {worked|been working} {at|for} this company for two years.'], 'TENSE'),
        T(1, '我學英文三年了。', 'I\'ve studied English for three years.', ['I have {studied|learned|been studying|been learning} English for three years.'], 'TENSE'),
        T(1, '我認識他十年了。', 'I\'ve known him for ten years.', ['I have been friends with him for ten years.'], 'TENSE'),
        T(1, '我感冒一個星期了。', 'I\'ve had a cold for a week.', ['I have {had a cold|been sick|been ill} for {a week|one week}.'], 'TENSE'),
        T(1, '我們結婚五年了。', 'We\'ve been married for five years.', ['We have been married for five years{ now|}.'], 'TENSE'),
        T(1, '我有這台車兩年了。', 'I\'ve had this car for two years.', ['I have {had|owned} {this car|my car|the car} for two years.'], 'TENSE'),
        T(2, '他從去年開始在這裡工作。', 'He has worked here since last year.', ['He has been working here since last year.', 'Since last year he has {worked|been working} here.'], 'TENSE'),
        T(2, '我從星期一就一直在生病。', 'I\'ve been sick since Monday.', ['I have been {sick|ill} since Monday.', 'I have {felt|been feeling} {sick|ill} since Monday.'], 'TENSE'),
        T(2, '她從 2019 年就住在台北。', 'She has lived in Taipei since 2019.', ['She has {lived|been living|stayed} in Taipei since 2019.'], 'PREPOSITION'),
        T(2, '我們從早上就一直在等。', 'We\'ve been waiting since this morning.', ['We have been waiting since {this morning|the morning|morning}.'], 'TENSE'),
        T(2, '他們從上個月就沒有見面。', 'They haven\'t seen each other since last month.', ['They have not {seen each other|met|met up|seen one another} since last month.'], 'TENSE'),
        T(2, '我從小就喜歡狗。', 'I\'ve liked dogs since I was a child.', ['I have {liked|loved} dogs since I was {a child|little|a kid|young}.', 'I have {liked|loved} dogs since childhood.'], 'TENSE', H),
        T(2, '她從星期五就沒有睡覺。', 'She hasn\'t slept since Friday.', ['She has not {slept|had any sleep|gotten any sleep} since Friday.'], 'TENSE', H),
        T(3, '你住在這裡多久了？', 'How long have you lived here?', ['How long have you {lived here|been living here|stayed here|been here|lived in this place|been living in this place}?'], 'TENSE'),
        T(3, '你當老師多久了？', 'How long have you been a teacher?', ['How long have you {been a teacher|been teaching|worked as a teacher|been working as a teacher}?'], 'TENSE'),
        T(3, '我三天沒有看到他了。', 'I haven\'t seen him for three days.', ['I have not seen him {for|in} three days.', 'I have not met him for three days.'], 'TENSE'),
        T(3, '他從八歲開始就彈鋼琴了。', 'He has played the piano since he was eight.', ['He has {played|been playing} {the piano|piano} since he was eight.', 'He has played the piano since the age of eight.'], 'TENSE'),
        T(3, '雨已經下了一整天了。', 'It\'s been raining all day.', ['It has been raining {all day|all day long|the whole day|for the whole day|the entire day|for a whole day}.', 'It has rained all day.'], 'TENSE'),
        T(3, '我們已經等你一個小時了。', 'We have been waiting for you for an hour.', ['We have {been waiting|waited} for you for {an hour|one hour}.'], 'TENSE'),
        T(3, '他自從搬家以後就沒有打電話給我。', 'He hasn\'t called me since he moved.', ['He has not {called|phoned} me since he {moved|moved away|left}.', 'He has not {called|phoned} since he {moved|moved away|left}.'], 'TENSE')
      ]
    },

    /* ================================================================ P20 */
    {
      id: 'P20', order: 20, title: '問資訊', label: 'Do you know where…?', short: 'Do you know where …?',
      mother: 'Do you know where the station is?',
      zh: '你知道車站在哪裡嗎？',
      template: 'Do you know [疑問詞] ＋ 主詞 ＋ 動詞?',
      explain: '禮貌地問資訊，用 Do you know ＋疑問詞，後面的字序變回一般句子（where the station is），不用問句的順序（where is the station）。',
      contrast: [{ ok: 'Do you know where he lives?', ng: 'Do you know where does he live?', note: '疑問詞後面用一般句子的順序' }, { ok: 'Do you know what time it is?', ng: 'Do you know what time is it?', note: '字序不要倒過來' }],
      cloze: { A: [6], B: [3, 5, 6] },
      focus: 'WORD_ORDER',
      free: {
        prompts: ['用 Do you know … ? 問一個你想知道的資訊。', '用 Could you tell me … ? 禮貌地問路或問時間。'],
        examples: ['Do you know when the bank opens?', 'Could you tell me how much this costs?']
      },
      items: [
        T(1, '你知道廁所在哪裡嗎？', 'Do you know where the restroom is?', ['Do you know where the {restroom|bathroom|toilet|washroom} is?'], 'WORD_ORDER'),
        T(1, '你知道書店在哪裡嗎？', 'Do you know where the bookstore is?', ['Do you know where the {bookstore|book store|bookshop} is?'], 'WORD_ORDER'),
        T(1, '你知道我的鑰匙在哪裡嗎？', 'Do you know where my keys are?', ['Do you know where my key is?'], 'WORD_ORDER'),
        T(1, '你知道我的手機在哪裡嗎？', 'Do you know where my phone is?', ['Do you know where my {cell phone|cellphone|mobile phone|mobile|smartphone} is?'], 'WORD_ORDER'),
        T(1, '你知道醫院在哪裡嗎？', 'Do you know where the hospital is?', [], 'WORD_ORDER'),
        T(1, '你知道她住在哪裡嗎？', 'Do you know where she lives?', ['Do you know where she {is living|stays}?'], 'SUBJECT_VERB'),
        T(2, '你知道現在幾點嗎？', 'Do you know what time it is?', ['Do you know what time it is {now|right now}?'], 'WORD_ORDER'),
        T(2, '你知道會議幾點開始嗎？', 'Do you know when the meeting starts?', ['Do you know {when|what time} the meeting {starts|begins|is going to start|will start|is going to begin|will begin}?'], 'WORD_ORDER'),
        T(2, '你知道這個多少錢嗎？', 'Do you know how much this is?', ['Do you know how much {this|it|this one} {is|costs}?'], 'WORD_ORDER'),
        T(2, '你知道他為什麼遲到嗎？', 'Do you know why he is late?', ['Do you know why he {is|was} {late|so late}?'], 'WORD_ORDER'),
        T(2, '你知道她是誰嗎？', 'Do you know who she is?', ['Do you know who she was?'], 'WORD_ORDER'),
        T(2, '你知道這家店幾點關門嗎？', 'Do you know what time the store closes?', ['Do you know {what time|when} {the|this} {store|shop} {closes|will close|is going to close|shuts}?'], 'WORD_ORDER', H),
        T(2, '你知道怎麼去車站嗎？', 'Do you know how to get to the station?', ['Do you know {how to go to the station|how to reach the station|how I can get to the station|how I get to the station}?'], 'WORD_ORDER', H),
        T(3, '可以請你告訴我車站在哪裡嗎？', 'Could you tell me where the station is?', ['{Could|Can|Would} you {please |}tell me where the {train |bus |subway |metro |}station is?'], 'WORD_ORDER'),
        T(3, '你知道這附近有沒有銀行嗎？', 'Do you know if there is a bank near here?', ['Do you know {if|whether} there is a bank ' + NEARBY + '?'], 'WORD_ORDER'),
        T(3, '你知道商店開不開嗎？', 'Do you know if the store is open?', ['Do you know {if|whether} the {store|shop} is open{ now| today| right now|}?'], 'WORD_ORDER'),
        T(3, '我不知道他住在哪裡。', 'I don\'t know where he lives.', ['I have no idea where he {lives|is living|stays}.', 'I do not know where he {is living|stays}.'], 'WORD_ORDER'),
        T(3, '你知道他今天為什麼沒來嗎？', 'Do you know why he didn\'t come today?', ['Do you know why he {did not come|did not show up|is not here|was not here}{ today|}?', 'Do you know why he {was|is} absent today?'], 'WORD_ORDER'),
        T(3, '你知道這班公車去哪裡嗎？', 'Do you know where this bus goes?', ['Do you know where {this|the} bus {goes|is going|goes to|is headed|is going to}?'], 'WORD_ORDER'),
        T(3, '可以請你告訴我這個要怎麼用嗎？', 'Could you tell me how to use this?', ['{Could|Can|Would} you {please |}tell me how to use {this|it|this one}?'], 'WORD_ORDER')
      ]
    }

    /* @@NEXT@@ */
  ];

  P10.addChapter({
    id: 2, title: '日常開口說', blurb: '日常對話最常用的 10 個框架：請求、點餐、必須、計畫、道謝道歉、提議、問地點、比較、持續多久、問資訊。',
    patterns: PATTERNS
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = P10;
})(globalThis);
