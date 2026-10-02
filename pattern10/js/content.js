/* Pattern 10 — 種子教材（MVP Seed Pack）
 * 10 個核心 Pattern × 約 20 個變形。全部自行編寫（不搬運任何教材原文）。
 *
 * 答案寫法：acc 陣列放「也算對」的說法。
 *   {a|b|c}  → 三選一（組合會自動展開）；{ before|} → 可有可無
 *   縮寫不用重複列（I'm = I am、don't = do not 系統自動視為相同）
 *   If … , … 句型會自動接受前後換位（If it rains, we'll stay. = We'll stay if it rains.）
 * h:1 = 留作「能力檢測」用的未見題，平常訓練不會出現。
 */
(function (g) {
  'use strict';
  const P10 = (g.P10 = g.P10 || {});

  const T = (level, zh, en, acc, focus, o) => ({ level, zh, en, acc: acc || [], focus: focus || null, h: !!(o && o.h) });
  const H = { h: 1 };

  const PATTERNS = [
    /* ================================================================ P01 */
    {
      id: 'P01', order: 1, title: '日常習慣', label: 'I usually…', short: 'I usually … before …',
      mother: 'I usually drink coffee before I start work.',
      zh: '我通常在開始工作前喝咖啡。',
      template: 'I usually [動作] before [事件].',
      explain: '說「習慣」用現在式。usually（通常）放在動詞前面。before 後面接一個完整的句子（主詞＋動詞），而且用現在式、不用 will。',
      contrast: [{ ok: 'I usually read before I sleep.', ng: 'I usually read before I will sleep.', note: 'before 後面不用 will' }],
      cloze: { A: [6], B: [1, 4, 6] },
      focus: 'TENSE',
      free: {
        prompts: ['用 I usually … before … 說一件你每天都會做的事。', '說說你出門前的習慣（用 usually 和 before）。'],
        examples: ['I usually brush my teeth before I go to bed.', 'I usually check the weather before I leave home.']
      },
      items: [
        T(1, '我通常在吃早餐前喝水。', 'I usually drink water before I eat breakfast.', ['I usually {drink|have} {a glass of |}water before {I eat|I have|eating|having} breakfast.'], 'TENSE'),
        T(1, '我通常在睡覺前看書。', 'I usually read a book before I go to bed.', ['I usually read {a book |books |}before {I go to bed|I sleep|going to bed|bed|sleeping}.'], 'TENSE'),
        T(1, '我通常在出門前吃早餐。', 'I usually eat breakfast before I leave home.', ['I usually {eat|have} breakfast before {I leave home|I leave the house|I go out|I leave|leaving home|leaving the house|going out}.'], 'TENSE'),
        T(1, '我通常在上班前運動。', 'I usually exercise before I go to work.', ['I usually {exercise|work out} before {I go to work|work|I leave for work|going to work|I start work|I get to work}.'], 'TENSE'),
        T(1, '我通常在吃飯前洗手。', 'I usually wash my hands before I eat.', ['I usually wash my hands before {I eat|I eat a meal|I have a meal|eating|meals|a meal|I have dinner|I have lunch|dinner|lunch}.'], 'TENSE'),
        T(1, '我通常在睡覺前聽音樂。', 'I usually listen to music before I go to bed.', ['I usually listen to music before {I go to bed|I sleep|going to bed|bed|sleeping}.'], 'TENSE'),
        T(1, '我通常在買東西前先比價。', 'I usually compare prices before I buy things.', ['I usually compare prices before {I buy things|I buy something|I buy|buying things|buying something|I shop|shopping}.'], 'TENSE'),
        T(2, '她通常在上班前喝茶。', 'She usually drinks tea before she goes to work.', ['She usually {drinks|has} {tea|a cup of tea} before {she goes to work|work|she leaves for work|going to work|she starts work|she gets to work}.'], 'SUBJECT_VERB'),
        T(2, '我爸爸通常在吃晚餐前看新聞。', 'My father usually watches the news before he eats dinner.', ['My {father|dad} usually watches {the news|TV news|the news on TV} before {he eats dinner|he has dinner|dinner|eating dinner|having dinner}.'], 'SUBJECT_VERB'),
        T(2, '我們通常在上課前聊天。', 'We usually talk before class starts.', ['We usually {talk|chat} before {class starts|the class starts|class|class begins|the class begins|we start class|the lesson starts}.'], 'TENSE'),
        T(2, '我妹妹通常在睡覺前洗澡。', 'My sister usually takes a shower before she goes to bed.', ['My sister usually {takes|has} a {shower|bath} before {she goes to bed|she sleeps|going to bed|bed|sleeping}.'], 'SUBJECT_VERB'),
        T(2, '他們通常在出門前看天氣。', 'They usually check the weather before they go out.', ['They usually {check|look at} the weather before {they go out|they leave|they leave home|going out|leaving|leaving home}.'], 'TENSE', H),
        T(2, '我哥哥通常在說話前先想一想。', 'My brother usually thinks before he speaks.', ['My brother usually thinks {first |}before he {speaks|talks}.'], 'SUBJECT_VERB', H),
        T(3, '週末我通常在起床前先看手機。', 'On weekends, I usually check my phone before I get up.', ['{On weekends|On the weekend|At the weekend} I usually {check|look at} my phone before {I get up|I get out of bed|getting up|getting out of bed}.', 'I usually {check|look at} my phone before {I get up|I get out of bed|getting up|getting out of bed} {on weekends|on the weekend|at the weekend}.'], 'TENSE'),
        T(3, '早上我通常在去公司前先運動。', 'In the morning, I usually exercise before I go to the office.', ['In the morning I usually {exercise|work out} before {I go to the office|I go to work|I leave for work|I leave for the office|going to the office|going to work|work}.', 'I usually {exercise|work out} in the morning before {I go to the office|I go to work|I leave for work|I leave for the office|going to the office|going to work|work}.'], 'TENSE'),
        T(3, '星期天我通常在朋友來之前打掃房間。', 'On Sundays, I usually clean my room before my friends come.', ['{On Sundays|On Sunday} I usually {clean|tidy} my room before my friends {come|come over|arrive|get here}.', 'I usually {clean|tidy} my room before my friends {come|come over|arrive|get here} on {Sundays|Sunday}.'], 'TENSE'),
        T(3, '我通常在回家前先買晚餐。', 'I usually buy dinner before I go home.', ['I usually {buy|get} dinner before {I go home|I get home|I come home|going home|getting home}.'], 'TENSE'),
        T(3, '我們通常在吃飯前等大家。', 'We usually wait for everyone before we eat.', ['We usually wait for {everyone|everybody|the others} before {we eat|we start eating|we begin to eat|eating|we have dinner|we have lunch}.'], 'TENSE'),
        T(3, '她通常在回答前先想一下。', 'She usually thinks for a moment before she answers.', ['She usually {thinks|thinks about it|thinks for a moment|thinks for a while|thinks for a second|thinks a little} before she {answers|replies|responds|speaks}.'], 'SUBJECT_VERB'),
        T(3, '我通常在下班前回覆所有訊息。', 'I usually answer all my messages before I leave work.', ['I usually {answer|reply to|respond to} all {my messages|the messages} before I {leave work|leave the office|go home|finish work}.'], 'TENSE')
      ]
    },

    /* ================================================================ P02 */
    {
      id: 'P02', order: 2, title: '過去與現在', label: 'I used to…', short: 'I used to …, but now …',
      mother: 'I used to stay up late, but now I go to bed early.',
      zh: '我以前常熬夜，但現在我很早睡。',
      template: 'I used to [過去習慣], but now [現在狀態].',
      explain: 'used to 的意思是「以前常常…，現在不了」，後面直接接原形動詞，不加 -ed。後半句用 but now 切換到現在，動詞用現在式。',
      contrast: [{ ok: 'I used to walk, but now I drive.', ng: 'I used to walked, but now I drive.', note: 'used to 後面用原形' }],
      cloze: { A: [1, 2], B: [1, 2, 6, 7, 9] },
      focus: 'TENSE',
      free: {
        prompts: ['用 I used to … but now … 說說你以前和現在的不同。', '說一個你已經改掉的習慣（用 used to 和 but now）。'],
        examples: ['I used to play video games every night, but now I go for a walk.', 'I used to drink a lot of soda, but now I drink water.']
      },
      items: [
        T(1, '我以前常喝咖啡，但現在我喝茶。', 'I used to drink coffee, but now I drink tea.', ['I used to {drink|have} coffee, but now I {drink|have} tea.'], 'TENSE'),
        T(1, '我以前常吃肉，但現在我吃蔬菜。', 'I used to eat meat, but now I eat vegetables.', ['I used to {eat|have} meat, but now I {eat|have} {vegetables|veggies}.'], 'TENSE'),
        T(1, '我以前常搭公車，但現在我騎腳踏車。', 'I used to take the bus, but now I ride a bike.', ['I used to {take|ride} the bus, but now I {ride|use} {a bike|a bicycle|my bike|my bicycle}.', 'I used to go by bus, but now I go by {bike|bicycle}.'], 'TENSE'),
        T(1, '我以前常玩遊戲，但現在我看書。', 'I used to play games, but now I read books.', ['I used to play {games|video games|computer games}, but now I {read books|read a book|read}.'], 'TENSE'),
        T(1, '我以前常打電話，但現在我傳訊息。', 'I used to make phone calls, but now I send messages.', ['I used to {make phone calls|make calls|call people|call}, but now I {send messages|send a message|send texts|send a text|send text messages|text}.'], 'TENSE'),
        T(1, '我以前常看電視，但現在我聽音樂。', 'I used to watch TV, but now I listen to music.', ['I used to watch {TV|television}, but now I listen to music.'], 'TENSE'),
        T(2, '他以前常抽菸，但現在他不抽了。', 'He used to smoke, but now he doesn\'t.', ['He used to smoke, but now he {doesn\'t|does not|doesn\'t smoke|does not smoke|doesn\'t smoke anymore|does not smoke anymore|no longer smokes}.', 'He used to smoke, but he {doesn\'t|does not} {smoke |}anymore.'], 'SUBJECT_VERB'),
        T(2, '她以前住在台北，但現在她住在高雄。', 'She used to live in Taipei, but now she lives in Kaohsiung.', [], 'SUBJECT_VERB'),
        T(2, '我弟弟以前很愛哭，但現在他很勇敢。', 'My brother used to cry a lot, but now he is brave.', ['My {brother|younger brother} used to cry {a lot|easily|all the time}, but now he is brave.'], 'SUBJECT_VERB'),
        T(2, '他們以前常吵架，但現在他們是好朋友。', 'They used to fight, but now they are good friends.', ['They used to {fight|argue|fight a lot|argue a lot|fight all the time|argue all the time}, but now they are {good friends|friends|close friends}.'], 'TENSE'),
        T(2, '我們以前常去海邊，但現在我們去山上。', 'We used to go to the beach, but now we go to the mountains.', ['We used to go to the {beach|sea|seaside}, but now we go to the {mountains|mountain|hills}.'], 'TENSE', H),
        T(2, '我媽媽以前常做蛋糕，但現在她買蛋糕。', 'My mother used to make cakes, but now she buys them.', ['My {mother|mom} used to {make|bake} {cakes|cake|a cake}, but now she {buys them|buys cakes|buys cake|buys one|buys it|buys a cake}.'], 'SUBJECT_VERB', H),
        T(3, '我以前每天都跑步，但現在我很少運動。', 'I used to run every day, but now I rarely exercise.', ['I used to {run|go running|jog} every day, but now I {rarely|seldom|hardly ever} {exercise|work out|do exercise}.'], 'TENSE'),
        T(3, '我以前上班很遠，但現在我在家工作。', 'I used to work far from home, but now I work from home.', ['I used to work {far from home|far away from home|far away}, but now I work {from home|at home}.'], 'TENSE'),
        T(3, '小時候我常害怕黑暗，但現在我不怕了。', 'When I was a child, I used to be afraid of the dark, but now I\'m not.', ['{When I was a child|When I was a kid|When I was little|When I was young|As a child|As a kid} I used to be {afraid of|scared of} the dark, but now I {am not|am not afraid|am not scared|am not afraid of it|am not scared of it}.', 'I used to be {afraid of|scared of} the dark when I was {a child|a kid|little|young}, but now I {am not|am not afraid|am not scared|am not afraid of it|am not scared of it}.'], 'TENSE'),
        T(3, '以前我常遲到，但現在我總是準時。', 'I used to be late, but now I\'m always on time.', ['I used to be {late|often late|late a lot|late all the time}, but now I am always on time.'], 'TENSE'),
        T(3, '我以前不喜歡魚，但現在我很喜歡。', 'I used to hate fish, but now I love it.', ['I used to {hate|dislike|not like} fish, but now I {love|like|really like|enjoy} {it|them|fish|eating it|eating fish}.'], 'TENSE'),
        T(3, '這家店以前很安靜，但現在很吵。', 'This shop used to be quiet, but now it is noisy.', ['This {shop|store|place|restaurant} used to be quiet, but now it is {noisy|loud|very noisy|very loud}.'], 'TENSE'),
        T(3, '我以前一個人住，但現在我跟朋友住。', 'I used to live alone, but now I live with my friends.', ['I used to live {alone|by myself|on my own}, but now I live with {my friends|a friend|friends|my friend}.'], 'TENSE'),
        T(3, '以前這裡有一家書店，但現在是咖啡店。', 'There used to be a bookstore here, but now it is a coffee shop.', ['There used to be a {bookstore|bookshop} here, but now it is a coffee shop.'], 'TENSE')
      ]
    },

    /* ================================================================ P03 */
    {
      id: 'P03', order: 3, title: '經驗', label: 'I\'ve never…', short: 'I\'ve never … before',
      mother: 'I\'ve never tried this before.',
      zh: '我以前從沒試過這個。',
      template: 'I\'ve never [過去分詞] before.',
      explain: '說「從來沒做過」用 have never ＋過去分詞（tried、been、seen）。句尾的 before 是「在這之前」的意思。I\'ve 就是 I have。',
      contrast: [{ ok: 'I\'ve never been to Japan before.', ng: 'I never went to Japan before.', note: '要用 have never ＋過去分詞' }],
      cloze: { A: [2], B: [0, 2, 4] },
      focus: 'TENSE',
      free: {
        prompts: ['用 I\'ve never … before 說一件你從沒做過的事。', '說一個你從沒去過的地方（用 I\'ve never …）。'],
        examples: ['I\'ve never tried skiing before.', 'I\'ve never been to Europe before.']
      },
      items: [
        T(1, '我以前從沒吃過這道菜。', 'I\'ve never eaten this dish before.', ['I have never {eaten|had|tried} {this dish|this food}{ before|}.'], 'TENSE'),
        T(1, '我以前從沒去過日本。', 'I\'ve never been to Japan before.', ['I have never {been to|visited} Japan{ before|}.'], 'TENSE'),
        T(1, '我以前從沒看過這部電影。', 'I\'ve never seen this movie before.', ['I have never {seen|watched} this {movie|film}{ before|}.'], 'TENSE'),
        T(1, '我以前從沒聽過這首歌。', 'I\'ve never heard this song before.', ['I have never heard this song{ before|}.'], 'TENSE'),
        T(1, '我以前從沒騎過馬。', 'I\'ve never ridden a horse before.', ['I have never {ridden a horse|ridden horses|been on a horse|ridden on a horse}{ before|}.'], 'TENSE'),
        T(1, '我以前從沒坐過飛機。', 'I\'ve never taken a plane before.', ['I have never {taken a plane|taken an airplane|taken a flight|been on a plane|been on an airplane|flown|flown on a plane}{ before|}.'], 'TENSE'),
        T(2, '她以前從沒學過游泳。', 'She has never learned to swim before.', ['She has never {learned|learnt} {to swim|how to swim}{ before|}.'], 'TENSE'),
        T(2, '他以前從沒見過雪。', 'He has never seen snow before.', ['He has never {seen snow|seen the snow}{ before|}.'], 'TENSE'),
        T(2, '我們以前從沒來過這家餐廳。', 'We\'ve never been to this restaurant before.', ['We have never {been to|visited|been in} this restaurant{ before|}.'], 'TENSE'),
        T(2, '他們以前從沒遲到過。', 'They\'ve never been late before.', ['They have never been late{ before|}.'], 'TENSE'),
        T(2, '我弟弟以前從沒生過病。', 'My brother has never been sick before.', ['My brother has never been {sick|ill}{ before|}.'], 'TENSE', H),
        T(2, '我從沒喝過這種茶。', 'I\'ve never had this kind of tea before.', ['I have never {had|drunk|tried} this {kind of |type of |}tea{ before|}.'], 'TENSE', H),
        T(3, '我這輩子從沒看過這麼美的海。', 'I\'ve never seen such a beautiful sea in my life.', ['I have never seen such a beautiful {sea|ocean}{ in my life| before|}.'], 'TENSE'),
        T(3, '我在台北從沒迷過路。', 'I\'ve never gotten lost in Taipei before.', ['I have never {gotten|got|been} lost in Taipei{ before|}.'], 'TENSE'),
        T(3, '我們在這家餐廳從沒等過這麼久。', 'We\'ve never waited this long at this restaurant before.', ['We have never waited {this long|so long|for this long|for so long} {at|in} this restaurant{ before|}.'], 'TENSE'),
        T(3, '我從沒在晚上一個人出去過。', 'I\'ve never gone out alone at night before.', ['I have never {gone out|been out} {alone|by myself|on my own} at night{ before|}.'], 'TENSE'),
        T(3, '我從沒想過這件事。', 'I\'ve never thought about this before.', ['I have never thought {about|of} {this|it|that}{ before|}.'], 'TENSE'),
        T(3, '我從沒這麼累過。', 'I\'ve never been this tired before.', ['I have never been {this|so|that} tired{ before|}.'], 'TENSE'),
        T(3, '她從沒在大家面前唱過歌。', 'She has never sung in front of everyone before.', ['She has never sung {in front of everyone|in front of people|in front of others|in public}{ before|}.'], 'TENSE'),
        T(3, '他從沒說過謊。', 'He has never told a lie before.', ['He has never {told a lie|lied|told lies}{ before|}.'], 'TENSE')
      ]
    },

    /* ================================================================ P04 */
    {
      id: 'P04', order: 4, title: '未來條件', label: 'If …, I\'ll …', short: 'If …, I\'ll …',
      mother: 'If I have time, I\'ll call you tonight.',
      zh: '如果我有時間，我今晚會打給你。',
      template: 'If [條件], I\'ll [行動].',
      explain: '說「如果…就會…」：if 後面用現在式（不用 will），主句才用 will。口語常縮寫成 I\'ll。前後兩半可以對調。',
      contrast: [{ ok: 'If it rains, I\'ll stay home.', ng: 'If it will rain, I\'ll stay home.', note: 'if 後面不用 will' }],
      cloze: { A: [2], B: [0, 2, 4] },
      focus: 'CONDITIONAL',
      free: {
        prompts: ['用 If …, I\'ll … 說說你這個週末的計畫。', '說一件「如果天氣好／有空，你就會去做」的事。'],
        examples: ['If it doesn\'t rain, I\'ll go hiking on Sunday.', 'If I finish early, I\'ll call my mother.']
      },
      items: [
        T(1, '如果我有錢，我會買新手機。', 'If I have money, I\'ll buy a new phone.', ['If I have {money|enough money}, I will buy a new {phone|cell phone|cellphone|mobile phone|smartphone}.'], 'CONDITIONAL'),
        T(1, '如果我有空，我會幫你。', 'If I\'m free, I\'ll help you.', ['If I {am free|have time|have some time|have free time}, I will help you.'], 'CONDITIONAL'),
        T(1, '如果天氣好，我們會去公園。', 'If the weather is good, we\'ll go to the park.', ['If {the weather is|it is} {good|nice|fine|sunny}, we will go to the park.'], 'CONDITIONAL'),
        T(1, '如果我餓了，我會吃點東西。', 'If I\'m hungry, I\'ll eat something.', ['If I {am|get|become|feel} hungry, I will {eat something|have something to eat|eat|get something to eat|have something}.'], 'CONDITIONAL'),
        T(1, '如果我累了，我會早點睡。', 'If I\'m tired, I\'ll go to bed early.', ['If I {am|get|feel} tired, I will {go to bed early|go to sleep early|sleep early|go to bed earlier|sleep earlier}.'], 'CONDITIONAL'),
        T(1, '如果我找到你的書，我會寄給你。', 'If I find your book, I\'ll send it to you.', ['If I find your book, I will {send it to you|send you the book|mail it to you|mail you the book|send the book to you|send it}.'], 'CONDITIONAL'),
        T(2, '如果他來，我會告訴他。', 'If he comes, I\'ll tell him.', ['If he {comes|comes here|arrives|shows up}, I will tell him{ about it|}.'], 'SUBJECT_VERB'),
        T(2, '如果她不喜歡，她會告訴我。', 'If she doesn\'t like it, she\'ll tell me.', ['If she {doesn\'t like it|does not like it|dislikes it}, she will {tell me|let me know}.'], 'CONDITIONAL'),
        T(2, '如果你不去，我也不去。', 'If you don\'t go, I won\'t go either.', ['If you {don\'t|do not} go, I {won\'t|will not} {go |}either.', 'If you {don\'t|do not} go, I am not going either.'], 'CONDITIONAL'),
        T(2, '如果他們遲到，我們會先開始。', 'If they are late, we\'ll start without them.', ['If they are late, we will {start without them|start first|begin without them|begin first}.'], 'CONDITIONAL'),
        T(2, '如果我哥哥有車，他會載我。', 'If my brother has a car, he\'ll give me a ride.', ['If my brother {has|gets|owns} a car, he will {give me a ride|drive me|drive me there|take me}.'], 'SUBJECT_VERB', H),
        T(2, '如果你需要幫忙，我會在這裡。', 'If you need help, I\'ll be here.', ['If you need {help|some help|any help|my help}, I will be {here|there|around|here for you|there for you}.'], 'CONDITIONAL', H),
        T(3, '如果明天下雨，我們就待在家裡。', 'If it rains tomorrow, we\'ll stay home.', ['If it {rains|is raining} tomorrow, we will stay {home|at home|in|inside}.'], 'CONDITIONAL'),
        T(3, '如果你今晚有空，我們就一起吃飯。', 'If you are free tonight, we\'ll have dinner together.', ['If you {are free|have time} tonight, we {will|can} {have dinner together|eat together|eat dinner together|have dinner}.'], 'CONDITIONAL'),
        T(3, '如果我下個月有錢，我就去旅行。', 'If I have money next month, I\'ll take a trip.', ['If I have {money|enough money} next month, I will {take a trip|go on a trip|travel|go traveling|take a vacation|go on a vacation|go on holiday}.'], 'CONDITIONAL'),
        T(3, '如果我今天做完工作，我就去看電影。', 'If I finish my work today, I\'ll go to the movies.', ['If I {finish|complete} {my work|work|the work} today, I will {go to the movies|go to a movie|go to the cinema|watch a movie|watch a film|see a movie|see a film|go see a movie|go see a film|go watch a movie|go watch a film}.'], 'CONDITIONAL'),
        T(3, '如果你說慢一點，我就聽得懂。', 'If you speak more slowly, I\'ll understand.', ['If you speak {more slowly|slower|slowly|a little slower|a little more slowly|a bit slower|a bit more slowly}, I {will|can} {understand|understand you|understand it|follow you}.'], 'CONDITIONAL'),
        T(3, '如果她準時到，我們就能趕上火車。', 'If she arrives on time, we\'ll catch the train.', ['If she {arrives|gets here|gets there|comes} on time, we {will|can} {catch|make} the train.', 'If she {arrives|gets here|gets there|comes} on time, we will be able to {catch|make} the train.'], 'CONDITIONAL'),
        T(3, '如果我忘了，我會再打給你。', 'If I forget, I\'ll call you again.', ['If I forget, I will {call you again|call you back|phone you again|call again}.'], 'CONDITIONAL'),
        T(3, '如果你不吃，我就吃。', 'If you don\'t eat it, I\'ll eat it.', ['If you {don\'t|do not} eat it, I will {eat it|have it}.'], 'CONDITIONAL')
      ]
    },

    /* ================================================================ P05 */
    {
      id: 'P05', order: 5, title: '希望／非現實願望', label: 'I wish…', short: 'I wish …',
      mother: 'I wish I had more time.',
      zh: '真希望我有更多時間。',
      template: 'I wish [非現實狀態].',
      explain: '現在實際上沒有足夠時間，因此 wish 後使用過去式 had，表達與現況不同的願望。注意：不是 I wish I have。',
      contrast: [{ ok: 'I wish I had a car.（其實沒有車）', ng: 'I wish I have a car.', note: 'wish 後面退一格用過去式' }],
      cloze: { A: [3], B: [1, 3, 4] },
      focus: 'WISH_REALITY',
      free: {
        prompts: ['用 I wish 說一件你現在希望改變的事情。', '說說你「希望自己有」的東西（用 I wish I had …）。'],
        examples: ['I wish I had more free time.', 'I wish my office were closer to home.']
      },
      items: [
        T(1, '真希望我有更多錢。', 'I wish I had more money.', ['I wish I had {more money|extra money|more cash}.'], 'WISH_REALITY'),
        T(1, '真希望我有一台車。', 'I wish I had a car.', ['I wish I {had|owned} a car.'], 'WISH_REALITY'),
        T(1, '真希望我有更多朋友。', 'I wish I had more friends.', [], 'WISH_REALITY'),
        T(1, '真希望我有一隻狗。', 'I wish I had a dog.', ['I wish I {had|owned} a dog.'], 'WISH_REALITY'),
        T(1, '真希望我有一個大房子。', 'I wish I had a big house.', ['I wish I {had|owned} a {big|large} house.'], 'WISH_REALITY'),
        T(1, '真希望我有更多假期。', 'I wish I had more holidays.', ['I wish I had more {holidays|vacation|vacations|vacation time|vacation days|time off|days off}.'], 'WISH_REALITY'),
        T(2, '真希望他住得近一點。', 'I wish he lived closer.', ['I wish he lived {closer|nearer|closer to me|nearer to me|closer to us|near me|near us|nearby|closer by}.'], 'WISH_REALITY'),
        T(2, '真希望她在這裡。', 'I wish she were here.', ['I wish she {were|was} {here|here with us|here with me}.'], 'WISH_REALITY'),
        T(2, '真希望我會彈鋼琴。', 'I wish I could play the piano.', ['I wish I {could play|knew how to play} the piano.'], 'WISH_REALITY'),
        T(2, '真希望我們有更多空間。', 'I wish we had more space.', ['I wish we had more {space|room}.'], 'WISH_REALITY'),
        T(2, '真希望他們住在這裡。', 'I wish they lived here.', ['I wish they lived {here|near here}.'], 'WISH_REALITY'),
        T(2, '真希望我跟他一樣高。', 'I wish I were as tall as him.', ['I wish I {were|was} as tall as {him|he is}.'], 'WISH_REALITY', H),
        T(2, '真希望我不用工作。', 'I wish I didn\'t have to work.', ['I wish I {didn\'t|did not} {have|need} to work.'], 'WISH_REALITY', H),
        T(3, '真希望我現在在家。', 'I wish I were at home now.', ['I wish I {were|was} {at home|home}{ now| right now|}.'], 'WISH_REALITY'),
        T(3, '真希望我們現在有更多時間聊天。', 'I wish we had more time to talk now.', ['I wish we had more time {to talk|to chat|for a chat|for talking}{ now| right now|}.'], 'WISH_REALITY'),
        T(3, '真希望我的辦公室離家近一點。', 'I wish my office were closer to home.', ['I wish my office {were|was} {closer to home|closer to my house|nearer to home|nearer to my house|closer to my home|nearer to my home}.'], 'WISH_REALITY'),
        T(3, '真希望我有更多時間陪家人。', 'I wish I had more time to spend with my family.', ['I wish I had more time {to spend with my family|with my family|for my family|to be with my family}.'], 'WISH_REALITY'),
        T(3, '真希望我現在不累。', 'I wish I weren\'t tired now.', ['I wish I {weren\'t|wasn\'t} {so |}tired{ now| right now|}.'], 'WISH_REALITY'),
        T(3, '真希望我知道答案。', 'I wish I knew the answer.', ['I wish I knew the {answer|right answer}.'], 'WISH_REALITY'),
        T(3, '真希望我會說更多英文。', 'I wish I could speak more English.', ['I wish I {could speak|knew} more English.'], 'WISH_REALITY'),
        T(3, '真希望今天是週末。', 'I wish today were the weekend.', ['I wish {today|it} {were|was} the weekend.'], 'WISH_REALITY')
      ]
    },

    /* ================================================================ P06 */
    {
      id: 'P06', order: 6, title: '花費時間', label: 'It took me…', short: 'It took me … to …',
      mother: 'It took me two hours to finish the work.',
      zh: '我花了兩個小時完成這項工作。',
      template: 'It took me [時間] to [完成某事].',
      explain: 'It took me ＋時間＋ to ＋原形動詞，意思是「我花了多少時間做某事」。took 是 take 的過去式；主詞換人，me 就換成 him、her、us、them。',
      contrast: [{ ok: 'It took her an hour to cook.', ng: 'It takes her an hour to cooking.', note: 'took 用過去式；to 後面接原形' }],
      cloze: { A: [1], B: [1, 2, 5, 6] },
      focus: 'TENSE',
      free: {
        prompts: ['用 It took me … to … 說一件最近花了你不少時間的事。', '說說你今天早上花了多久才出門（用 It took me …）。'],
        examples: ['It took me an hour to get to work this morning.', 'It took me three days to finish the book.']
      },
      items: [
        T(1, '我花了三個小時完成這份報告。', 'It took me three hours to finish this report.', ['It took me three hours to {finish|complete} {this|the} report.', 'It took me three hours to finish writing {this|the} report.'], 'TENSE'),
        T(1, '我花了一個小時做晚餐。', 'It took me an hour to cook dinner.', ['It took me {an hour|one hour} to {cook|make|prepare} dinner.'], 'TENSE'),
        T(1, '我花了十分鐘找我的鑰匙。', 'It took me ten minutes to find my keys.', ['It took me ten minutes to find my {keys|key}.'], 'TENSE'),
        T(1, '我花了兩天讀完這本書。', 'It took me two days to read this book.', ['It took me two days to {read|finish reading|finish} {this|the} book.'], 'TENSE'),
        T(1, '我花了半小時到學校。', 'It took me half an hour to get to school.', ['It took me {half an hour|thirty minutes} to {get to|go to|reach} school.'], 'TENSE'),
        T(1, '我花了一個星期學會這首歌。', 'It took me a week to learn this song.', ['It took me {a week|one week|seven days} to learn {this|the} song.'], 'TENSE'),
        T(2, '他花了兩個小時修好電腦。', 'It took him two hours to fix the computer.', ['It took him two hours to {fix|repair} {the|his|that} computer.'], 'TENSE'),
        T(2, '她花了三年學會英文。', 'It took her three years to learn English.', ['It took her three years to {learn|master} English{ well|}.'], 'TENSE'),
        T(2, '我們花了四個小時開車到那裡。', 'It took us four hours to drive there.', ['It took us four hours to {drive there|get there|drive over there|get there by car}.'], 'TENSE'),
        T(2, '他們花了一個月蓋這間房子。', 'It took them a month to build this house.', ['It took them {a month|one month} to build {this|the} {house|home}.'], 'TENSE'),
        T(2, '我弟弟花了很久才起床。', 'It took my brother a long time to get up.', ['It took my brother {a long time|a very long time|so long|a while|too long} to {get up|wake up|get out of bed}.'], 'TENSE', H),
        T(2, '老師花了十分鐘解釋這個問題。', 'It took the teacher ten minutes to explain this problem.', ['It took the teacher ten minutes to explain {this|the} {problem|question}.'], 'TENSE', H),
        T(3, '昨晚我花了很久才睡著。', 'It took me a long time to fall asleep last night.', ['It took me {a long time|a very long time|a long while} to {fall asleep|get to sleep|go to sleep} last night.', 'Last night it took me {a long time|a very long time|a long while} to {fall asleep|get to sleep|go to sleep}.'], 'TENSE'),
        T(3, '今天早上我花了二十分鐘才找到停車位。', 'It took me twenty minutes to find a parking space this morning.', ['It took me twenty minutes to find {a parking space|a parking spot|a place to park|somewhere to park} this morning.', 'This morning it took me twenty minutes to find {a parking space|a parking spot|a place to park|somewhere to park}.'], 'TENSE'),
        T(3, '上個月我花了兩天才完成這個計畫。', 'It took me two days to finish this project last month.', ['It took me two days to {finish|complete} {this|the} {project|plan} last month.', 'Last month it took me two days to {finish|complete} {this|the} {project|plan}.'], 'TENSE'),
        T(3, '去年我花了六個月減了五公斤。', 'It took me six months to lose five kilograms last year.', ['It took me six months to lose five {kilograms|kilos|kg} last year.', 'Last year it took me six months to lose five {kilograms|kilos|kg}.'], 'TENSE'),
        T(3, '我們花了很久才找到這家店。', 'It took us a long time to find this shop.', ['It took us {a long time|so long|a while} to find {this|the} {shop|store|place|restaurant}.'], 'TENSE'),
        T(3, '她花了一整個下午整理房間。', 'It took her the whole afternoon to clean the room.', ['It took her {the whole afternoon|all afternoon|the entire afternoon|an entire afternoon} to {clean|clean up|tidy|tidy up} {the room|her room}.'], 'TENSE'),
        T(3, '他花了兩個月才學會開車。', 'It took him two months to learn to drive.', ['It took him two months to learn {to drive|how to drive}{ a car|}.'], 'TENSE'),
        T(3, '我花了五分鐘走到車站。', 'It took me five minutes to walk to the station.', ['It took me five minutes to walk to the {station|train station}.'], 'TENSE')
      ]
    },

    /* ================================================================ P07 */
    {
      id: 'P07', order: 7, title: '原因', label: 'The reason…', short: 'The reason … is that …',
      mother: 'The reason I came early is that I wanted to talk to you.',
      zh: '我提早來的原因是我想跟你聊聊。',
      template: 'The reason [事件] is that [原因].',
      explain: 'The reason … is that … 是「…的原因是…」。前面放事件（I came early），中間 is that，後面放原因。reason 已經是「原因」，後面不再用 because。',
      contrast: [{ ok: 'The reason I\'m tired is that I slept late.', ng: 'The reason I\'m tired because I slept late.', note: '中間要有 is that' }],
      cloze: { A: [5, 6], B: [1, 5, 6, 8] },
      focus: 'CONJUNCTION',
      free: {
        prompts: ['用 The reason … is that … 說明你最近做的某個決定。', '說說你為什麼學英文（用 The reason … is that …）。'],
        examples: ['The reason I started learning English is that I want to travel.', 'The reason I woke up early is that I had a meeting.']
      },
      items: [
        T(1, '我遲到的原因是我睡過頭了。', 'The reason I was late is that I overslept.', ['The reason {why |}I was late is that I {overslept|slept in|woke up late|got up late|slept too long}.'], 'CONJUNCTION'),
        T(1, '我來這裡的原因是我想見你。', 'The reason I came here is that I wanted to see you.', ['The reason {why |}I came here is that I wanted to {see|meet} you.'], 'CONJUNCTION'),
        T(1, '我搬家的原因是房租太貴了。', 'The reason I moved is that the rent was too expensive.', ['The reason {why |}I moved is that the rent {was|is} too {expensive|high|much}.'], 'CONJUNCTION'),
        T(1, '我學英文的原因是我想去旅行。', 'The reason I study English is that I want to travel.', ['The reason {why |}I {study|learn|am learning|am studying} English is that I {want|would like} to travel.'], 'CONJUNCTION'),
        T(1, '我今天沒去的原因是我生病了。', 'The reason I didn\'t go today is that I was sick.', ['The reason {why |}I {didn\'t|did not} {go|come} today is that I {was|am|felt} {sick|ill}.'], 'CONJUNCTION'),
        T(1, '我選這家店的原因是它很安靜。', 'The reason I chose this shop is that it is quiet.', ['The reason {why |}I {chose|picked|selected} this {shop|store|place|restaurant} is that it {is|was} {quiet|very quiet}.'], 'CONJUNCTION'),
        T(2, '他生氣的原因是我沒回電話。', 'The reason he is angry is that I didn\'t call him back.', ['The reason {why |}he {is|was} {angry|mad} is that I {didn\'t|did not} {call him back|return his call|call back|answer his call|call him}.'], 'CONJUNCTION'),
        T(2, '她離開的原因是她很累。', 'The reason she left is that she was tired.', ['The reason {why |}she left is that she {was|is|felt} tired.'], 'CONJUNCTION'),
        T(2, '他們沒來的原因是下雨了。', 'The reason they didn\'t come is that it rained.', ['The reason {why |}they {didn\'t|did not} come is that {it rained|it was raining|it started raining}.'], 'CONJUNCTION'),
        T(2, '我哥哥搬走的原因是他找到新工作。', 'The reason my brother moved away is that he found a new job.', ['The reason {why |}my brother moved {away|out} is that he {found|got} a new job.'], 'CONJUNCTION'),
        T(2, '老師生氣的原因是我們太吵了。', 'The reason the teacher is angry is that we are too noisy.', ['The reason {why |}the teacher {is|was} {angry|mad} is that we {are|were} {too noisy|too loud|making too much noise|so noisy}.'], 'CONJUNCTION', H),
        T(2, '我們早到的原因是路上沒有車。', 'The reason we arrived early is that there was no traffic.', ['The reason {why |}we {arrived|got there|got here|came} early is that there {was|is} {no traffic|no cars|not much traffic|little traffic}.'], 'CONJUNCTION', H),
        T(3, '我昨天沒回你訊息的原因是我的手機沒電了。', 'The reason I didn\'t reply to your message yesterday is that my phone ran out of battery.', ['The reason {why |}I {didn\'t|did not} {reply to|answer|respond to} your message yesterday is that my {phone|battery} {was dead|died}.', 'The reason {why |}I {didn\'t|did not} {reply to|answer|respond to} your message yesterday is that my phone {ran out of battery|ran out of power|had no battery|was out of battery|was out of power}.'], 'CONJUNCTION'),
        T(3, '這家餐廳受歡迎的原因是食物又好吃又便宜。', 'The reason this restaurant is popular is that the food is good and cheap.', ['The reason {why |}this restaurant is popular is that the food is {good and cheap|delicious and cheap|tasty and cheap|cheap and good|cheap and delicious|good and not expensive|good and inexpensive|delicious and inexpensive}.'], 'CONJUNCTION'),
        T(3, '我每天早起的原因是我喜歡安靜的早晨。', 'The reason I get up early every day is that I like quiet mornings.', ['The reason {why |}I {get up|wake up} early {every day|each day|daily} is that I {like|love|enjoy} {quiet mornings|a quiet morning|the quiet morning}.'], 'CONJUNCTION'),
        T(3, '她今天心情很好的原因是她考試考得很好。', 'The reason she is happy today is that she did well on her test.', ['The reason {why |}she {is|was} {happy|in a good mood} today is that she {did well|did very well|did great} {on|in} {her|the} {test|exam}.', 'The reason {why |}she {is|was} {happy|in a good mood} today is that she {got a good score|got a good grade} {on|in} {her|the} {test|exam}.'], 'CONJUNCTION'),
        T(3, '我不吃肉的原因是我覺得它對身體不好。', 'The reason I don\'t eat meat is that I think it is bad for my health.', ['The reason {why |}I {don\'t|do not} eat meat is that I {think|feel|believe} it is {bad for my health|bad for me|not good for my health|not good for me|unhealthy|bad for my body|not good for my body}.'], 'CONJUNCTION'),
        T(3, '我們這麼晚回家的原因是路上塞車。', 'The reason we came home so late is that there was a lot of traffic.', ['The reason {why |}we {came|got|went} home {so late|this late} is that there {was|is} {a lot of traffic|heavy traffic|a traffic jam|too much traffic|bad traffic|lots of traffic}.'], 'CONJUNCTION'),
        T(3, '我不想去的原因是我明天要早起。', 'The reason I don\'t want to go is that I have to get up early tomorrow.', ['The reason {why |}I {don\'t|do not} want to go is that I {have to|need to|must} {get up|wake up} early tomorrow.'], 'CONJUNCTION'),
        T(3, '那個孩子哭的原因是他找不到媽媽。', 'The reason the child is crying is that he can\'t find his mom.', ['The reason {why |}the {child|kid|boy} {is crying|was crying|cried|cries} is that he {can\'t|cannot|couldn\'t|could not} find his {mom|mother}.'], 'CONJUNCTION')
      ]
    },

    /* ================================================================ P08 */
    {
      id: 'P08', order: 8, title: '不確定', label: 'I\'m not sure…', short: 'I\'m not sure whether …',
      mother: 'I\'m not sure whether he will come.',
      zh: '我不確定他會不會來。',
      template: 'I\'m not sure whether [情況].',
      explain: 'I\'m not sure whether … 是「我不確定是不是／會不會…」。whether 後面接一般句子的順序（he will come），不是問句（✗ will he come）。口語也可以用 if。',
      contrast: [{ ok: 'I\'m not sure whether she knows.', ng: 'I\'m not sure whether does she know.', note: 'whether 後面不用問句順序' }],
      cloze: { A: [3], B: [1, 3, 5] },
      focus: 'WORD_ORDER',
      free: {
        prompts: ['用 I\'m not sure whether … 說一件你現在不確定的事。', '說說你這個週末「不確定會不會」的事。'],
        examples: ['I\'m not sure whether I should buy a new phone.', 'I\'m not sure whether it will rain tomorrow.']
      },
      items: [
        T(1, '我不確定她會不會喜歡。', 'I\'m not sure whether she will like it.', ['I am not sure {whether|if} she will like {it|this|that}.'], 'WORD_ORDER'),
        T(1, '我不確定這是不是對的。', 'I\'m not sure whether this is right.', ['I am not sure {whether|if} {this is|it is|that is} {right|correct}.'], 'WORD_ORDER'),
        T(1, '我不確定他們有沒有空。', 'I\'m not sure whether they are free.', ['I am not sure {whether|if} they {are free|are available|have time}.'], 'WORD_ORDER'),
        T(1, '我不確定那家店有沒有開。', 'I\'m not sure whether the shop is open.', ['I am not sure {whether|if} the {shop|store} is open.'], 'WORD_ORDER'),
        T(1, '我不確定你需不需要幫忙。', 'I\'m not sure whether you need help.', ['I am not sure {whether|if} you need {help|some help|any help|my help}.'], 'WORD_ORDER'),
        T(1, '我不確定這道菜辣不辣。', 'I\'m not sure whether this dish is spicy.', ['I am not sure {whether|if} {this dish|this food|it|this} is spicy.'], 'WORD_ORDER'),
        T(2, '他不確定自己能不能做到。', 'He isn\'t sure whether he can do it.', ['He is not sure {whether|if} he can {do it|make it|do that}.'], 'WORD_ORDER'),
        T(2, '她不確定明天會不會下雨。', 'She isn\'t sure whether it will rain tomorrow.', ['She is not sure {whether|if} it {will rain|is going to rain|rains} tomorrow.'], 'WORD_ORDER'),
        T(2, '我們不確定老師有沒有收到信。', 'We aren\'t sure whether the teacher got the email.', ['We are not sure {whether|if} the teacher {got|received|has received|has got} the {email|letter|mail}.'], 'WORD_ORDER'),
        T(2, '我不確定我該不該去。', 'I\'m not sure whether I should go.', ['I am not sure {whether|if} I should go.', 'I am not sure whether to go.'], 'WORD_ORDER'),
        T(2, '我不確定他知不知道。', 'I\'m not sure whether he knows.', ['I am not sure {whether|if} he {knows|knows about it|knows it|knows that}.'], 'WORD_ORDER', H),
        T(2, '我不確定這個週末你有沒有空。', 'I\'m not sure whether you are free this weekend.', ['I am not sure {whether|if} you {are free|are available|have time} this weekend.'], 'WORD_ORDER', H),
        T(3, '我不確定他今晚會不會來參加派對。', 'I\'m not sure whether he will come to the party tonight.', ['I am not sure {whether|if} he will {come to|come over to|show up at|go to} the party tonight.', 'I am not sure {whether|if} he will {come to|go to} tonight\'s party.'], 'WORD_ORDER'),
        T(3, '我不確定明天的會議會不會取消。', 'I\'m not sure whether tomorrow\'s meeting will be canceled.', ['I am not sure {whether|if} {tomorrow\'s meeting|the meeting tomorrow} will be canceled.', 'I am not sure {whether|if} the meeting will be canceled tomorrow.'], 'WORD_ORDER'),
        T(3, '我不確定飛機會不會準時到。', 'I\'m not sure whether the plane will arrive on time.', ['I am not sure {whether|if} the {plane|flight} {will arrive on time|arrives on time|will be on time|is going to arrive on time}.'], 'WORD_ORDER'),
        T(3, '我不確定我昨天有沒有鎖門。', 'I\'m not sure whether I locked the door yesterday.', ['I am not sure {whether|if} I locked the door yesterday.'], 'WORD_ORDER'),
        T(3, '我不確定我們需不需要帶傘。', 'I\'m not sure whether we need to bring an umbrella.', ['I am not sure {whether|if} we {need to|have to|should|must} {bring|take} {an umbrella|umbrellas}.', 'I am not sure {whether|if} we need {an umbrella|umbrellas}.'], 'WORD_ORDER'),
        T(3, '我不確定他現在在不在家。', 'I\'m not sure whether he is at home now.', ['I am not sure {whether|if} he is {at home|home}{ now| right now|}.'], 'WORD_ORDER'),
        T(3, '我不確定她是不是真的想去。', 'I\'m not sure whether she really wants to go.', ['I am not sure {whether|if} she {really|actually|truly} wants to go.'], 'WORD_ORDER'),
        T(3, '他不確定這個決定對不對。', 'He isn\'t sure whether this decision is right.', ['He is not sure {whether|if} {this decision is right|this decision is correct|this is the right decision|it is the right decision|this decision is the right one}.'], 'WORD_ORDER')
      ]
    },

    /* ================================================================ P09 */
    {
      id: 'P09', order: 9, title: '偏好', label: 'I\'d rather…', short: 'I\'d rather … than …',
      mother: 'I\'d rather stay home than go out tonight.',
      zh: '我今晚寧願待在家，也不想出去。',
      template: 'I\'d rather [A] than [B].',
      explain: 'would rather A than B 是「寧願 A 也不要 B」，I\'d 就是 I would。rather 和 than 後面都直接接原形動詞，不加 to、不加 -ing。',
      contrast: [{ ok: 'I\'d rather walk than drive.', ng: 'I\'d rather to walk than driving.', note: '兩邊都用原形動詞' }],
      cloze: { A: [1, 4], B: [0, 1, 4, 5] },
      focus: 'GERUND_INFINITIVE',
      free: {
        prompts: ['用 I\'d rather … than … 說說你的偏好。', '說一件「你寧願做 A，也不想做 B」的事。'],
        examples: ['I\'d rather cook at home than eat out.', 'I\'d rather read a book than watch TV.']
      },
      items: [
        T(1, '我寧願喝茶也不要喝咖啡。', 'I\'d rather drink tea than coffee.', ['I would rather {drink|have} tea than {drink |have |}coffee.'], 'GERUND_INFINITIVE'),
        T(1, '我寧願走路也不要搭公車。', 'I\'d rather walk than take the bus.', ['I would rather walk than {take the bus|ride the bus|take a bus|go by bus|catch the bus}.'], 'GERUND_INFINITIVE'),
        T(1, '我寧願看書也不要看電視。', 'I\'d rather read a book than watch TV.', ['I would rather {read a book|read|read books} than watch {TV|television}.'], 'GERUND_INFINITIVE'),
        T(1, '我寧願吃麵也不要吃飯。', 'I\'d rather eat noodles than rice.', ['I would rather {eat|have} noodles than {eat |have |}rice.'], 'GERUND_INFINITIVE'),
        T(1, '我寧願早點睡也不要熬夜。', 'I\'d rather go to bed early than stay up late.', ['I would rather {go to bed early|sleep early} than {stay up late|stay up all night|stay up}.'], 'GERUND_INFINITIVE'),
        T(1, '我寧願自己做也不要請別人幫忙。', 'I\'d rather do it myself than ask for help.', ['I would rather {do it myself|do it by myself|do it on my own} than ask {for help|someone for help|someone else|other people for help|others for help|others to help}.'], 'GERUND_INFINITIVE'),
        T(2, '她寧願留在家也不想去派對。', 'She\'d rather stay home than go to the party.', ['She would rather {stay home|stay at home|stay in} than go to the party.'], 'GERUND_INFINITIVE'),
        T(2, '他寧願付現金也不要用信用卡。', 'He\'d rather pay in cash than use a credit card.', ['He would rather {pay in cash|pay cash|pay with cash|use cash} than {use a credit card|pay by credit card|pay with a credit card|use his credit card|use credit cards}.'], 'GERUND_INFINITIVE'),
        T(2, '我們寧願搭火車也不要開車。', 'We\'d rather take the train than drive.', ['We would rather {take the train|go by train|take a train} than {drive|go by car|take a car|take the car}.'], 'GERUND_INFINITIVE'),
        T(2, '他們寧願早點出發也不要遲到。', 'They\'d rather leave early than be late.', ['They would rather {leave early|start early|go early} than {be late|arrive late|get there late|come late}.'], 'GERUND_INFINITIVE'),
        T(2, '我媽媽寧願在家煮也不要出去吃。', 'My mother would rather cook at home than eat out.', ['My {mother|mom} would rather {cook at home|cook} than {eat out|go out to eat|eat at a restaurant}.'], 'GERUND_INFINITIVE', H),
        T(2, '我朋友寧願走樓梯也不要搭電梯。', 'My friend would rather take the stairs than take the elevator.', ['My friend would rather {take the stairs|use the stairs|climb the stairs} than {take the elevator|use the elevator|take the lift|use the lift|ride the elevator}.'], 'GERUND_INFINITIVE', H),
        T(3, '今天晚上我寧願早點睡也不想看電影。', 'I\'d rather go to bed early than watch a movie tonight.', ['Tonight I would rather {go to bed early|sleep early} than {watch a movie|watch a film|watch movies|see a movie|see a film}.', 'I would rather {go to bed early|sleep early} than {watch a movie|watch a film|watch movies|see a movie|see a film} tonight.', 'I would rather {go to bed early|sleep early} tonight than {watch a movie|watch a film|watch movies|see a movie|see a film}.'], 'GERUND_INFINITIVE'),
        T(3, '週末我寧願待在家也不想去人多的地方。', 'On weekends, I\'d rather stay home than go to crowded places.', ['On {weekends|the weekend} I would rather {stay home|stay at home|stay in} than {go to crowded places|go somewhere crowded|go to a crowded place|go to places with a lot of people|go to places with lots of people|go to busy places}.', 'I would rather {stay home|stay at home|stay in} than {go to crowded places|go somewhere crowded|go to a crowded place|go to places with a lot of people|go to places with lots of people|go to busy places} on {weekends|the weekend}.'], 'GERUND_INFINITIVE'),
        T(3, '下雨的時候，我寧願看電影也不想出門。', 'When it rains, I\'d rather watch a movie than go out.', ['{When it rains|When it is raining|If it rains|On rainy days} I would rather {watch a movie|watch a film|watch movies|watch films|stay home and watch a movie|stay home and watch a film} than {go out|leave the house|go outside}.', 'I would rather {watch a movie|watch a film|watch movies|watch films|stay home and watch a movie|stay home and watch a film} than {go out|leave the house|go outside} {when it rains|when it is raining|on rainy days}.'], 'GERUND_INFINITIVE'),
        T(3, '這個夏天我寧願去海邊也不想去山上。', 'This summer, I\'d rather go to the beach than go to the mountains.', ['This summer I would rather go to the {beach|sea} than {go to |}the mountains.', 'I would rather go to the {beach|sea} than {go to |}the mountains this summer.'], 'GERUND_INFINITIVE'),
        T(3, '我今天寧願一個人吃飯也不想跟他們一起吃。', 'I\'d rather eat alone today than eat with them.', ['I would rather eat {alone|by myself|on my own} today than {eat |}with them.', 'Today I would rather eat {alone|by myself|on my own} than {eat |}with them.'], 'GERUND_INFINITIVE'),
        T(3, '我寧願現在告訴你真相也不想騙你。', 'I\'d rather tell you the truth now than lie to you.', ['I would rather tell you the truth{ now| right now|} than lie to you.'], 'GERUND_INFINITIVE'),
        T(3, '明天我寧願早起也不想趕時間。', 'Tomorrow I\'d rather get up early than be in a hurry.', ['Tomorrow I would rather {get up|wake up} early than {be in a hurry|rush|hurry}.', 'I would rather {get up|wake up} early tomorrow than {be in a hurry|rush|hurry}.'], 'GERUND_INFINITIVE'),
        T(3, '我寧願現在做完也不要留到明天。', 'I\'d rather finish it now than leave it until tomorrow.', ['I would rather {finish it|complete it|do it|get it done|finish} now than {leave it until tomorrow|leave it for tomorrow|put it off until tomorrow|wait until tomorrow|do it tomorrow|finish it tomorrow}.'], 'GERUND_INFINITIVE')
      ]
    },

    /* ================================================================ P10 */
    {
      id: 'P10', order: 10, title: '期待', label: 'I\'m looking forward to…', short: 'I\'m looking forward to …',
      mother: 'I\'m looking forward to seeing you again.',
      zh: '我很期待再見到你。',
      template: 'I\'m looking forward to [名詞／動名詞].',
      explain: 'look forward to 是「期待」，這裡的 to 是介系詞（不是 to ＋原形），所以後面接名詞或 -ing：I\'m looking forward to the trip. / to seeing you.',
      contrast: [{ ok: 'I\'m looking forward to meeting you.', ng: 'I\'m looking forward to meet you.', note: 'to 後面接 -ing 或名詞' }],
      cloze: { A: [4], B: [1, 2, 3, 4] },
      focus: 'GERUND_INFINITIVE',
      free: {
        prompts: ['用 I\'m looking forward to … 說一件你期待的事。', '說說你下個月最期待的事（用 looking forward to）。'],
        examples: ['I\'m looking forward to the holidays.', 'I\'m looking forward to seeing my friends this weekend.']
      },
      items: [
        T(1, '我很期待週末。', 'I\'m looking forward to the weekend.', ['I am {really |so |}looking forward to {the weekend|this weekend}.', 'I look forward to {the weekend|this weekend}.'], 'GERUND_INFINITIVE'),
        T(1, '我很期待這次旅行。', 'I\'m looking forward to this trip.', ['I am {really |so |}looking forward to {this trip|the trip|my trip|this journey|the journey}.', 'I look forward to {this trip|the trip|my trip}.'], 'GERUND_INFINITIVE'),
        T(1, '我很期待你的回信。', 'I\'m looking forward to your reply.', ['I am {really |so |}looking forward to {your reply|your answer|your response|hearing from you|hearing back from you}.', 'I look forward to {your reply|your answer|your response|hearing from you}.'], 'GERUND_INFINITIVE'),
        T(1, '我很期待新的一年。', 'I\'m looking forward to the new year.', ['I am {really |so |}looking forward to {the new year|a new year|next year|the coming year}.', 'I look forward to {the new year|a new year|next year}.'], 'GERUND_INFINITIVE'),
        T(1, '我很期待明天的演唱會。', 'I\'m looking forward to tomorrow\'s concert.', ['I am {really |so |}looking forward to {tomorrow\'s concert|the concert tomorrow}.', 'I look forward to {tomorrow\'s concert|the concert tomorrow}.'], 'GERUND_INFINITIVE'),
        T(1, '我很期待這個假期。', 'I\'m looking forward to this holiday.', ['I am {really |so |}looking forward to {this holiday|this vacation|the holiday|the vacation|my holiday|my vacation}.', 'I look forward to {this holiday|this vacation|the holiday|the vacation}.'], 'GERUND_INFINITIVE'),
        T(2, '我期待見到你的家人。', 'I\'m looking forward to meeting your family.', ['I am looking forward to {meeting|seeing} your {family|family members}.', 'I look forward to {meeting|seeing} your {family|family members}.'], 'GERUND_INFINITIVE'),
        T(2, '我期待跟你一起工作。', 'I\'m looking forward to working with you.', ['I am looking forward to working {with you|together with you}.', 'I look forward to working {with you|together with you}.'], 'GERUND_INFINITIVE'),
        T(2, '他期待回家。', 'He is looking forward to going home.', ['He is looking forward to {going home|coming home|getting home|returning home|going back home|being home}.', 'He looks forward to {going home|coming home|getting home|returning home}.'], 'GERUND_INFINITIVE'),
        T(2, '她期待收到你的禮物。', 'She is looking forward to getting your gift.', ['She is looking forward to {getting|receiving} your {gift|present}.', 'She looks forward to {getting|receiving} your {gift|present}.'], 'GERUND_INFINITIVE'),
        T(2, '我們期待參加你的婚禮。', 'We are looking forward to attending your wedding.', ['We are looking forward to {attending|going to|coming to|being at} your wedding.', 'We look forward to {attending|going to|coming to|being at} your wedding.'], 'GERUND_INFINITIVE', H),
        T(2, '他們期待搬進新家。', 'They are looking forward to moving into their new house.', ['They are looking forward to moving {into|to} {their new house|their new home|a new house|a new home|the new house|the new home|their new place}.', 'They look forward to moving {into|to} {their new house|their new home|a new house|a new home}.'], 'GERUND_INFINITIVE', H),
        T(3, '我很期待下個月去日本旅行。', 'I\'m looking forward to traveling to Japan next month.', ['I am looking forward to {traveling to|going to|visiting|taking a trip to|going on a trip to} Japan next month.', 'I am looking forward to my trip to Japan next month.', 'I look forward to {traveling to|going to|visiting} Japan next month.'], 'GERUND_INFINITIVE'),
        T(3, '我很期待週末跟朋友一起吃飯。', 'I\'m looking forward to having dinner with my friends this weekend.', ['I am looking forward to {eating|having dinner|having a meal|having lunch|eating dinner} with {my friends|friends|my friend} this weekend.', 'This weekend I am looking forward to {eating|having dinner|having a meal|having lunch|eating dinner} with {my friends|friends|my friend}.'], 'GERUND_INFINITIVE'),
        T(3, '她很期待明年開始新工作。', 'She is looking forward to starting her new job next year.', ['She is looking forward to {starting|beginning} {her new job|a new job|her new work} next year.'], 'GERUND_INFINITIVE'),
        T(3, '我們都很期待看到結果。', 'We are all looking forward to seeing the results.', ['We are all looking forward to {seeing|hearing|knowing} the {results|result}.'], 'GERUND_INFINITIVE'),
        T(3, '孩子們很期待明天去動物園。', 'The children are looking forward to going to the zoo tomorrow.', ['The {children|kids} are looking forward to {going to|visiting} the zoo tomorrow.'], 'GERUND_INFINITIVE'),
        T(3, '我很期待早點下班。', 'I\'m looking forward to leaving work early.', ['I am looking forward to {leaving work early|getting off work early|finishing work early|going home early|leaving early}.'], 'GERUND_INFINITIVE'),
        T(3, '我很期待聽到你的好消息。', 'I\'m looking forward to hearing your good news.', ['I am looking forward to hearing {your good news|good news from you|the good news|your news}.'], 'GERUND_INFINITIVE'),
        T(3, '我很期待學習新的東西。', 'I\'m looking forward to learning new things.', ['I am {really |so |}looking forward to {learning|studying} {new things|something new|new stuff}.'], 'GERUND_INFINITIVE')
      ]
    }
  ];

  /* 攤平成 patterns[] 與 exercises[]（每題給固定 id：P05-T07） */
  const patterns = [], exercises = [];
  PATTERNS.forEach((p) => {
    const items = p.items; delete p.items;
    p.active = true;
    p.source = 'seed';
    patterns.push(p);
    items.forEach((it, i) => {
      exercises.push({
        id: p.id + '-T' + String(i + 1).padStart(2, '0'), pattern: p.id, level: it.level, zh: it.zh, en: it.en, acc: it.acc,
        focus: it.focus, holdout: it.h, source: 'manual', active: true
      });
    });
  });

  P10.seed = { version: 1, patterns, exercises };
  if (typeof module !== 'undefined' && module.exports) module.exports = P10;
})(globalThis);
