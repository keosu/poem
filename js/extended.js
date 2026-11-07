'use strict';

// 扩展库：初中、高中课标诗词曲各 40 首，文言短文不收。本文件放初中与公用部分。
// 配图约定左侧留给竖排诗文，动效落在天空与右半。
// 各脚本共用一个全局作用域，顶层的 const 互相冲突，所以动效小件都包在 poemFx 里。

var poemFx = (() => {
const L = (s) => s.split('|');
const mist = (color = '248,246,240', n = 4) => ({ t: 'mist', y: [0.04, 0.42], n, color, a: [0.18, 0.36] });
const sun = (a = 0.42, color = '255,206,140', at = [0.58, 0.32]) => ({ t: 'glow', at, r: 0.46, color, a });
const rays = (color = '255,214,160', at = [0.58, 0.32]) => ({ t: 'rays', at, dir: -1.15, spread: 1.15, n: 7, len: 0.5, color, a: 0.055 });
const moon = (at = [0.58, 0.28]) => ({ t: 'glow', at, r: 0.2, color: '226,232,255', a: 0.45 });
const stars = (n = 48) => ({ t: 'stars', area: [0.02, 0, 0.98, 0.5], n });
const birds = (kind = 'bird', count = [1, 3]) => ({ t: 'birds', kind, y: [0.08, 0.3], every: [11, 18], count });
const geese = () => ({ t: 'birds', kind: 'goose', y: [0.12, 0.28], every: [16, 24], count: [5, 7], formation: 'v' });
const wind = (a = 0.24, n = 8) => ({ t: 'wind', area: [0.35, 0.08, 1, 0.72], n, color: '255,255,255', a });
const rain = (n = 70, a = 0.32) => ({ t: 'rain', n, slant: 0.18, color: '186,196,206', a });
const snow = (n = 56) => ({ t: 'fall', kind: 'snow', n, wind: 0.018 });
const leaves = (n = 12) => ({ t: 'fall', kind: 'leaf', n, wind: 0.02, from: [0.48, 0, 1.06, 0.42] });
const maple = (n = 18) => ({ t: 'fall', kind: 'maple', n, wind: 0.05, gust: 1, from: [0.42, 0, 1.06, 0.5] });
const petals = (n = 16) => ({ t: 'fall', kind: 'petal', n, wind: 0.016, from: [0.5, 0.02, 1.05, 0.55] });
const water = (a = 0.3) => ({ t: 'shimmer', area: [0.38, 0.6, 1, 0.98], color: '255,255,248', n: 30, a });
const rip = () => ({ t: 'ripples', area: [0.4, 0.64, 0.98, 0.96], rate: 0.4, r1: 0.028 });
const grass = (color = '90,120,72') => ({ t: 'grass', color, n: 90, h: [0.035, 0.09], wind: 0.9 });
const motes = (color = '255,244,210') => ({ t: 'motes', area: [0.4, 0.15, 1, 0.88], n: 24, color, size: [0.0012, 0.0026], blink: true, rise: 0.008 });
const bugs = (kind = 'butterfly', n = 3) => ({ t: 'insects', kind, area: [0.5, 0.32, 0.96, 0.72], n });
const fire = (at = [0.74, 0.78]) => ({ t: 'glow', at, r: 0.11, color: '255,140,50', a: 0.7, flicker: true, mode: 'lighter' });
const embers = (at = [0.74, 0.78]) => ({ t: 'embers', at, n: 16, spread: 0.025, rise: 0.1, color: '255,160,70' });
const lanterns = (pts = [[0.62, 0.4], [0.74, 0.36], [0.86, 0.44], [0.7, 0.52]]) => ({ t: 'lights', color: '255,186,90', r: 0.045, a: 0.75, pts });
const tick = (name, every = [12, 20]) => ({ t: 'sfx', name, every });
const bolt = () => ({ t: 'flash', color: '220,226,240', every: [9, 16] });
return {
  L, mist, sun, rays, moon, stars, birds, geese, wind, rain, snow, leaves, maple, petals,
  water, rip, grass, motes, bugs, fire, embers, lanterns, tick, bolt,
};
})();

var EXTENDED = [];

(() => {
const { L, mist, sun, rays, moon, stars, birds, geese, wind, rain, snow, leaves, maple, petals, water, rip, grass, motes, bugs, fire, embers, lanterns, tick, bolt } = poemFx;

EXTENDED.push(
  { id: 'guanju', lib: 'junior', title: '关雎', dynasty: '先秦', author: '诗经', theme: 'light', sound: 'stream', topics: ['爱情'], caption: '河洲雎鸠，寤寐求之',
    lines: L('关关雎鸠|在河之洲|窈窕淑女|君子好逑|参差荇菜|左右流之|窈窕淑女|寤寐求之|求之不得|寤寐思服|悠哉悠哉|辗转反侧|参差荇菜|左右采之|窈窕淑女|琴瑟友之|参差荇菜|左右芼之|窈窕淑女|钟鼓乐之'),
    fx: [mist('236,244,236'), water(), rip(), birds('egret', [1, 2]), bugs('dragonfly', 2)] },
  { id: 'jianjia', lib: 'junior', title: '蒹葭', dynasty: '先秦', author: '诗经', theme: 'light', sound: 'stream', topics: ['爱情'], caption: '蒹葭苍苍，白露为霜',
    lines: L('蒹葭苍苍|白露为霜|所谓伊人|在水一方|溯洄从之|道阻且长|溯游从之|宛在水中央|蒹葭萋萋|白露未晞|所谓伊人|在水之湄|溯洄从之|道阻且跻|溯游从之|宛在水中坻|蒹葭采采|白露未已|所谓伊人|在水之涘|溯洄从之|道阻且右|溯游从之|宛在水中沚'),
    fx: [mist('236,240,244', 5), water(0.22), rip(), wind(0.16)] },
  { id: 'shiwu', lib: 'junior', title: '十五从军征', dynasty: '汉', author: '汉乐府', seal: '乐府', theme: 'light', sound: 'wind', topics: ['思乡'], caption: '松柏冢累累，泪落沾衣',
    lines: L('十五从军征|八十始得归|道逢乡里人|家中有阿谁|遥看是君家|松柏冢累累|兔从狗窦入|雉从梁上飞|中庭生旅谷|井上生旅葵|舂谷持作饭|采葵持作羹|羹饭一时熟|不知贻阿谁|出门东向看|泪落沾我衣'),
    fx: [mist('232,228,216'), wind(0.2), grass('120,116,72'), birds('bird', [1, 2])] },
  { id: 'guancanghai', lib: 'junior', title: '观沧海', dynasty: '汉', author: '曹操', theme: 'dark', sound: 'waves', topics: ['山水'], caption: '日月之行，若出其中',
    lines: L('东临碣石|以观沧海|水何澹澹|山岛竦峙|树木丛生|百草丰茂|秋风萧瑟|洪波涌起|日月之行|若出其中|星汉灿烂|若出其里|幸甚至哉|歌以咏志'),
    fx: [mist('180,196,214', 5), stars(30), moon([0.73, 0.29]), wind(0.34, 12), water(0.4)] },
  { id: 'yinjiu', lib: 'junior', title: '饮酒', subtitle: '其五', dynasty: '晋', author: '陶渊明', theme: 'light', sound: 'autumn', topics: ['田园', '哲理'], caption: '采菊东篱，悠然南山',
    lines: L('结庐在人境|而无车马喧|问君何能尔|心远地自偏|采菊东篱下|悠然见南山|山气日夕佳|飞鸟相与还|此中有真意|欲辨已忘言'),
    fx: [mist('250,236,210'), sun(0.32, '255,196,120'), petals(10), birds('bird', [2, 4]), grass('150,140,70')] },
  { id: 'mulan', lib: 'junior', title: '木兰诗', dynasty: '北朝', author: '北朝民歌', seal: '民歌', theme: 'light', sound: 'wind', topics: ['边塞'], caption: '万里赴戎机，关山度若飞',
    lines: L('唧唧复唧唧|木兰当户织|不闻机杼声|唯闻女叹息|问女何所思|问女何所忆|女亦无所思|女亦无所忆|昨夜见军帖|可汗大点兵|军书十二卷|卷卷有爷名|阿爷无大儿|木兰无长兄|愿为市鞍马|从此替爷征|东市买骏马|西市买鞍鞯|南市买辔头|北市买长鞭|旦辞爷娘去|暮宿黄河边|不闻爷娘唤女声|但闻黄河流水鸣溅溅|旦辞黄河去|暮至黑山头|不闻爷娘唤女声|但闻燕山胡骑鸣啾啾|万里赴戎机|关山度若飞|朔气传金柝|寒光照铁衣|将军百战死|壮士十年归|归来见天子|天子坐明堂|策勋十二转|赏赐百千强|可汗问所欲|木兰不用尚书郎|愿驰千里足|送儿还故乡|爷娘闻女来|出郭相扶将|阿姊闻妹来|当户理红妆|小弟闻姊来|磨刀霍霍向猪羊|开我东阁门|坐我西阁床|脱我战时袍|著我旧时裳|当窗理云鬓|对镜帖花黄|出门看火伴|火伴皆惊忙|同行十二年|不知木兰是女郎|雄兔脚扑朔|雌兔眼迷离|双兔傍地走|安能辨我是雄雌'),
    fx: [mist('220,216,200'), wind(0.3, 10), snow(18), birds('eagle', [1, 1])] },
  { id: 'songdushaofu', lib: 'junior', title: '送杜少府之任蜀州', dynasty: '唐', author: '王勃', theme: 'light', sound: 'wind', topics: ['送别'], caption: '海内存知己，天涯比邻',
    lines: L('城阙辅三秦|风烟望五津|与君离别意|同是宦游人|海内存知己|天涯若比邻|无为在歧路|儿女共沾巾'),
    fx: [mist(), sun(0.28), wind(), birds('bird', [1, 2])] },
  { id: 'dengyouzhoutai', lib: 'junior', title: '登幽州台歌', dynasty: '唐', author: '陈子昂', theme: 'light', sound: 'wind', topics: ['怀古'], caption: '前不见古人，后不见来者',
    lines: L('前不见古人|后不见来者|念天地之悠悠|独怆然而涕下'),
    fx: [mist('236,232,220', 5), wind(0.28, 11), birds('eagle', [1, 1])] },
  { id: 'cibeigu', lib: 'junior', title: '次北固山下', dynasty: '唐', author: '王湾', theme: 'light', sound: 'river', topics: ['羁旅', '思乡'], caption: '海日生残夜，江春入旧年',
    lines: L('客路青山外|行舟绿水前|潮平两岸阔|风正一帆悬|海日生残夜|江春入旧年|乡书何处达|归雁洛阳边'),
    fx: [mist('255,236,210'), sun(0.5, '255,186,110'), rays('255,200,140'), water(), rip(), geese()] },
  { id: 'shizhisaishang', lib: 'junior', title: '使至塞上', dynasty: '唐', author: '王维', theme: 'light', sound: 'desert', topics: ['边塞'], caption: '大漠孤烟直，长河落日圆',
    lines: L('单车欲问边|属国过居延|征蓬出汉塞|归雁入胡天|大漠孤烟直|长河落日圆|萧关逢候骑|都护在燕然'),
    fx: [sun(0.55, '255,150,70', [0.63, 0.45]), rays('255,170,90', [0.63, 0.45]), mist('236,214,180', 3), wind(0.26), geese(), motes('220,190,140')] },
  { id: 'wenwangchangling', lib: 'junior', title: '闻王昌龄左迁龙标遥有此寄', dynasty: '唐', author: '李白', theme: 'dark', sound: 'night', topics: ['送别'], caption: '我寄愁心与明月',
    lines: L('杨花落尽子规啼|闻道龙标过五溪|我寄愁心与明月|随君直到夜郎西'),
    fx: [moon([0.72, 0.21]), stars(), mist('40,48,70', 3), petals(12), tick('cuckoo', [14, 22])] },
  { id: 'xinglunan', lib: 'junior', title: '行路难', subtitle: '其一', dynasty: '唐', author: '李白', theme: 'light', sound: 'wind', topics: ['哲理'], caption: '长风破浪，直挂云帆',
    lines: L('金樽清酒斗十千|玉盘珍羞直万钱|停杯投箸不能食|拔剑四顾心茫然|欲渡黄河冰塞川|将登太行雪满山|闲来垂钓碧溪上|忽复乘舟梦日边|行路难|行路难|多歧路|今安在|长风破浪会有时|直挂云帆济沧海'),
    fx: [mist(), wind(0.32, 12), water(), snow(16), birds('eagle', [1, 1])] },
  { id: 'cuihuanghelou', lib: 'junior', title: '黄鹤楼', dynasty: '唐', author: '崔颢', theme: 'light', sound: 'river', topics: ['怀古', '思乡'], caption: '黄鹤一去，烟波江上',
    lines: L('昔人已乘黄鹤去|此地空余黄鹤楼|黄鹤一去不复返|白云千载空悠悠|晴川历历汉阳树|芳草萋萋鹦鹉洲|日暮乡关何处是|烟波江上使人愁'),
    fx: [mist('255,250,240', 5), sun(0.26), water(), birds('crane', [1, 2]), grass('120,150,80')] },
  { id: 'wangyue', lib: 'junior', title: '望岳', dynasty: '唐', author: '杜甫', theme: 'light', sound: 'wind', topics: ['山水'], caption: '会当凌绝顶，一览众山小',
    lines: L('岱宗夫如何|齐鲁青未了|造化钟神秀|阴阳割昏晓|荡胸生曾云|决眦入归鸟|会当凌绝顶|一览众山小'),
    fx: [mist('230,236,240', 6), sun(0.34), rays(), birds('eagle', [1, 1]), wind(0.2)] },
  { id: 'chunwang', lib: 'junior', title: '春望', dynasty: '唐', author: '杜甫', theme: 'light', sound: 'spring', topics: ['爱国'], caption: '国破山河在，城春草木深',
    lines: L('国破山河在|城春草木深|感时花溅泪|恨别鸟惊心|烽火连三月|家书抵万金|白头搔更短|浑欲不胜簪'),
    fx: [mist('236,240,220'), petals(20), birds('bird', [1, 2]), grass('80,110,60'), wind(0.16)] },
  { id: 'maowu', lib: 'junior', title: '茅屋为秋风所破歌', dynasty: '唐', author: '杜甫', theme: 'dark', sound: 'storm', topics: ['爱国'], caption: '八月秋高，风卷三重茅',
    lines: L('八月秋高风怒号|卷我屋上三重茅|茅飞渡江洒江郊|高者挂罥长林梢|下者飘转沉塘坳|南村群童欺我老无力|忍能对面为盗贼|公然抱茅入竹去|唇焦口燥呼不得|归来倚杖自叹息|俄顷风定云墨色|秋天漠漠向昏黑|布衾多年冷似铁|娇儿恶卧踏里裂|床头屋漏无干处|雨脚如麻未断绝|自经丧乱少睡眠|长夜沾湿何由彻|安得广厦千万间|大庇天下寒士俱欢颜|风雨不动安如山|呜呼|何时眼前突兀见此屋|吾庐独破受冻死亦足'),
    fx: [mist('60,64,72', 4), wind(0.4, 14), rain(120, 0.45), leaves(22), { t: 'flash', color: '210,220,235', every: [11, 18] }] },
  { id: 'baixuege', lib: 'junior', title: '白雪歌送武判官归京', dynasty: '唐', author: '岑参', theme: 'light', sound: 'snow', topics: ['边塞', '送别'], caption: '忽如一夜，千树梨花',
    lines: L('北风卷地白草折|胡天八月即飞雪|忽如一夜春风来|千树万树梨花开|散入珠帘湿罗幕|狐裘不暖锦衾薄|将军角弓不得控|都护铁衣冷难着|瀚海阑干百丈冰|愁云惨淡万里凝|中军置酒饮归客|胡琴琵琶与羌笛|纷纷暮雪下辕门|风掣红旗冻不翻|轮台东门送君去|去时雪满天山路|山回路转不见君|雪上空留马行处'),
    fx: [mist('230,236,242', 5), snow(80), wind(0.3, 10), tick('flute', [16, 26])] },
  { id: 'chouyuetian', lib: 'junior', title: '酬乐天扬州初逢席上见赠', dynasty: '唐', author: '刘禹锡', theme: 'light', sound: 'wind', topics: ['哲理'], caption: '沉舟侧畔，病树前头',
    lines: L('巴山楚水凄凉地|二十三年弃置身|怀旧空吟闻笛赋|到乡翻似烂柯人|沉舟侧畔千帆过|病树前头万木春|今日听君歌一曲|暂凭杯酒长精神'),
    fx: [mist(), sun(0.3), water(), wind(0.18), birds('bird', [2, 4])] },
  { id: 'maitanweng', lib: 'junior', title: '卖炭翁', dynasty: '唐', author: '白居易', theme: 'light', sound: 'snow', topics: ['田园'], caption: '心忧炭贱愿天寒',
    lines: L('卖炭翁|伐薪烧炭南山中|满面尘灰烟火色|两鬓苍苍十指黑|卖炭得钱何所营|身上衣裳口中食|可怜身上衣正单|心忧炭贱愿天寒|夜来城外一尺雪|晓驾炭车辗冰辙|牛困人饥日已高|市南门外泥中歇|翩翩两骑来是谁|黄衣使者白衫儿|手把文书口称敕|回车叱牛牵向北|一车炭|千余斤|宫使驱将惜不得|半匹红绡一丈绫|系向牛头充炭直'),
    fx: [mist('236,238,242'), snow(40), wind(0.22), { t: 'smoke', at: [0.78, 0.48], size: 0.03, color: '90,86,80' }] },
  { id: 'qiantanghu', lib: 'junior', title: '钱塘湖春行', dynasty: '唐', author: '白居易', theme: 'light', sound: 'spring', topics: ['春景'], caption: '几处早莺，谁家新燕',
    lines: L('孤山寺北贾亭西|水面初平云脚低|几处早莺争暖树|谁家新燕啄春泥|乱花渐欲迷人眼|浅草才能没马蹄|最爱湖东行不足|绿杨阴里白沙堤'),
    fx: [mist('240,248,236'), water(), rip(), petals(18), birds('swallow', [2, 4]), grass('130,170,80'), bugs('butterfly', 3)] },
  { id: 'yanmen', lib: 'junior', title: '雁门太守行', dynasty: '唐', author: '李贺', theme: 'dark', sound: 'desert', topics: ['边塞'], caption: '黑云压城，甲光向日',
    lines: L('黑云压城城欲摧|甲光向日金鳞开|角声满天秋色里|塞上燕脂凝夜紫|半卷红旗临易水|霜重鼓寒声不起|报君黄金台上意|提携玉龙为君死'),
    fx: [mist('40,36,64', 5), sun(0.35, '255,120,60'), wind(0.28), maple(8), motes('180,80,70')] },
  { id: 'chibi', lib: 'junior', title: '赤壁', dynasty: '唐', author: '杜牧', theme: 'dark', sound: 'river', topics: ['怀古'], caption: '折戟沉沙，东风未与',
    lines: L('折戟沉沙铁未销|自将磨洗认前朝|东风不与周郎便|铜雀春深锁二乔'),
    fx: [moon([0.7, 0.15]), stars(24), mist('30,40,60', 4), water(0.25), wind(0.2)] },
  { id: 'boqinhuai', lib: 'junior', title: '泊秦淮', dynasty: '唐', author: '杜牧', theme: 'dark', sound: 'night', topics: ['怀古'], caption: '烟笼寒水，夜泊秦淮',
    lines: L('烟笼寒水月笼沙|夜泊秦淮近酒家|商女不知亡国恨|隔江犹唱后庭花'),
    fx: [moon([0.5, 0.24]), mist('180,190,210', 5), water(0.22), lanterns(), rip()] },
  { id: 'yeyujibei', lib: 'junior', title: '夜雨寄北', dynasty: '唐', author: '李商隐', theme: 'dark', sound: 'rain', topics: ['思乡'], caption: '巴山夜雨，何当共剪',
    lines: L('君问归期未有期|巴山夜雨涨秋池|何当共剪西窗烛|却话巴山夜雨时'),
    fx: [rain(90, 0.4), mist('40,48,64', 3), lanterns(), rip()] },
  { id: 'wuti', lib: 'junior', title: '无题', subtitle: '相见时难', dynasty: '唐', author: '李商隐', theme: 'dark', sound: 'night', topics: ['爱情'], caption: '春蚕到死，蜡炬成灰',
    lines: L('相见时难别亦难|东风无力百花残|春蚕到死丝方尽|蜡炬成灰泪始干|晓镜但愁云鬓改|夜吟应觉月光寒|蓬山此去无多路|青鸟殷勤为探看'),
    fx: [moon([0.84, 0.18]), stars(20), petals(14), mist('48,40,64', 3), { t: 'glow', at: [0.66, 0.47], r: 0.08, color: '255,200,140', a: 0.45, flicker: true }] },
  { id: 'xiangjianhuan', lib: 'junior', title: '相见欢', subtitle: '无言独上', dynasty: '五代', author: '李煜', theme: 'dark', sound: 'night', topics: ['思乡'], caption: '无言独上西楼，月如钩',
    lines: L('无言独上西楼|月如钩|寂寞梧桐深院锁清秋|剪不断|理还乱|是离愁|别是一般滋味在心头'),
    fx: [moon([0.62, 0.22]), stars(16), mist('36,42,62', 3), leaves(8)] },
  { id: 'yujiaao', lib: 'junior', title: '渔家傲', subtitle: '秋思', dynasty: '宋', author: '范仲淹', theme: 'light', sound: 'desert', topics: ['边塞', '思乡'], caption: '长烟落日，孤城闭',
    lines: L('塞下秋来风景异|衡阳雁去无留意|四面边声连角起|千嶂里|长烟落日孤城闭|浊酒一杯家万里|燕然未勒归无计|羌管悠悠霜满地|人不寐|将军白发征夫泪'),
    fx: [sun(0.4, '255,120,60'), mist('80,60,50', 4), geese(), wind(0.26), tick('flute', [18, 28])] },
  { id: 'huanxisha', lib: 'junior', title: '浣溪沙', subtitle: '一曲新词', dynasty: '宋', author: '晏殊', theme: 'light', sound: 'spring', topics: ['哲理'], caption: '无可奈何花落去',
    lines: L('一曲新词酒一杯|去年天气旧亭台|夕阳西下几时回|无可奈何花落去|似曾相识燕归来|小园香径独徘徊'),
    fx: [sun(0.36, '255,170,100'), petals(22), birds('swallow', [1, 2]), mist('255,236,220')] },
  { id: 'dengfeilaifeng', lib: 'junior', title: '登飞来峰', dynasty: '宋', author: '王安石', theme: 'light', sound: 'wind', topics: ['哲理'], caption: '不畏浮云遮望眼',
    lines: L('飞来山上千寻塔|闻说鸡鸣见日升|不畏浮云遮望眼|自缘身在最高层'),
    fx: [sun(0.48), rays(), mist('255,244,220', 3), birds('bird', [1, 2])] },
  { id: 'jiangchengzi', lib: 'junior', title: '江城子', subtitle: '密州出猎', dynasty: '宋', author: '苏轼', theme: 'light', sound: 'wind', topics: ['爱国'], caption: '会挽雕弓如满月',
    lines: L('老夫聊发少年狂|左牵黄|右擎苍|锦帽貂裘|千骑卷平冈|为报倾城随太守|亲射虎|看孙郎|酒酣胸胆尚开张|鬓微霜|又何妨|持节云中|何日遣冯唐|会挽雕弓如满月|西北望|射天狼'),
    fx: [mist('236,228,200'), wind(0.34, 12), sun(0.3), birds('eagle', [1, 1]), grass('140,130,70')] },
  { id: 'shuidiaogetou', lib: 'junior', title: '水调歌头', subtitle: '明月几时有', dynasty: '宋', author: '苏轼', theme: 'dark', sound: 'night', topics: ['思乡', '哲理'], caption: '但愿人长久，千里婵娟',
    lines: L('明月几时有|把酒问青天|不知天上宫阙|今夕是何年|我欲乘风归去|又恐琼楼玉宇|高处不胜寒|起舞弄清影|何似在人间|转朱阁|低绮户|照无眠|不应有恨|何事长向别时圆|人有悲欢离合|月有阴晴圆缺|此事古难全|但愿人长久|千里共婵娟'),
    fx: [moon([0.7, 0.2]), stars(60), mist('30,40,70', 3), motes('220,230,255')] },
  { id: 'yujiaao-li', lib: 'junior', title: '渔家傲', subtitle: '天接云涛', dynasty: '宋', author: '李清照', theme: 'dark', sound: 'waves', topics: ['哲理'], caption: '九万里风鹏正举',
    lines: L('天接云涛连晓雾|星河欲转千帆舞|仿佛梦魂归帝所|闻天语|殷勤问我归何处|我报路长嗟日暮|学诗谩有惊人句|九万里风鹏正举|风休住|蓬舟吹取三山去'),
    fx: [stars(40), mist('180,190,220', 6), moon([0.9, 0.1]), wind(0.3), water(0.35), birds('crane', [1, 2])] },
  { id: 'youshanxicun', lib: 'junior', title: '游山西村', dynasty: '宋', author: '陆游', theme: 'light', sound: 'spring', topics: ['田园'], caption: '山重水复，柳暗花明',
    lines: L('莫笑农家腊酒浑|丰年留客足鸡豚|山重水复疑无路|柳暗花明又一村|箫鼓追随春社近|衣冠简朴古风存|从今若许闲乘月|拄杖无时夜叩门'),
    fx: [mist('236,244,220'), petals(12), water(), grass(), birds('swallow', [1, 3]), bugs('butterfly', 3)] },
  { id: 'nanxiangzi', lib: 'junior', title: '南乡子', subtitle: '登京口北固亭', dynasty: '宋', author: '辛弃疾', theme: 'light', sound: 'river', topics: ['怀古', '爱国'], caption: '不尽长江滚滚流',
    lines: L('何处望神州|满眼风光北固楼|千古兴亡多少事|悠悠|不尽长江滚滚流|年少万兜鍪|坐断东南战未休|天下英雄谁敌手|曹刘|生子当如孙仲谋'),
    fx: [mist(), water(0.4), wind(0.28), sun(0.26), birds('eagle', [1, 1])] },
  { id: 'pozhenzi', lib: 'junior', title: '破阵子', subtitle: '为陈同甫赋', dynasty: '宋', author: '辛弃疾', theme: 'dark', sound: 'campfire', topics: ['爱国'], caption: '醉里挑灯看剑',
    lines: L('醉里挑灯看剑|梦回吹角连营|八百里分麾下炙|五十弦翻塞外声|沙场秋点兵|马作的卢飞快|弓如霹雳弦惊|了却君王天下事|赢得生前身后名|可怜白发生'),
    fx: [fire(), embers(), stars(20), mist('20,24,36', 3), wind(0.18), lanterns()] },
  { id: 'guolingding', lib: 'junior', title: '过零丁洋', dynasty: '宋', author: '文天祥', theme: 'dark', sound: 'waves', topics: ['爱国'], caption: '人生自古谁无死',
    lines: L('辛苦遭逢起一经|干戈寥落四周星|山河破碎风飘絮|身世浮沉雨打萍|惶恐滩头说惶恐|零丁洋里叹零丁|人生自古谁无死|留取丹心照汗青'),
    fx: [mist('40,56,72', 5), wind(0.36, 12), water(0.35), rain(40, 0.22), moon([0.73, 0.25])] },
  { id: 'tianjingsha', lib: 'junior', title: '天净沙', subtitle: '秋思', dynasty: '元', author: '马致远', theme: 'light', sound: 'autumn', topics: ['羁旅', '思乡'], caption: '古道西风，断肠人在天涯',
    lines: L('枯藤老树昏鸦|小桥流水人家|古道西风瘦马|夕阳西下|断肠人在天涯'),
    fx: [sun(0.4, '255,170,110', [0.56, 0.45]), mist('236,220,190', 4), wind(0.3), water(), rip(), birds('bird', [2, 3]), maple(8)] },
  { id: 'shanpoyang', lib: 'junior', title: '山坡羊', subtitle: '潼关怀古', dynasty: '元', author: '张养浩', theme: 'light', sound: 'wind', topics: ['怀古'], caption: '兴，百姓苦；亡，百姓苦',
    lines: L('峰峦如聚|波涛如怒|山河表里潼关路|望西都|意踌躇|伤心秦汉经行处|宫阙万间都做了土|兴|百姓苦|亡|百姓苦'),
    fx: [mist('220,210,190', 5), sun(0.3, '255,150,80'), wind(0.32, 11), water(0.28)] },
  { id: 'jihai-haodang', lib: 'junior', title: '己亥杂诗', subtitle: '浩荡离愁', dynasty: '清', author: '龚自珍', theme: 'light', sound: 'spring', topics: ['送别', '哲理'], caption: '落红不是无情物',
    lines: L('浩荡离愁白日斜|吟鞭东指即天涯|落红不是无情物|化作春泥更护花'),
    fx: [sun(0.45, '255,170,100'), rays('255,190,130'), petals(24), wind(0.22), mist('255,236,220')] },
  { id: 'manjianghong', lib: 'junior', title: '满江红', subtitle: '小住京华', dynasty: '近代', author: '秋瑾', theme: 'light', sound: 'autumn', topics: ['爱国'], caption: '身不得男儿列，心却比男儿烈',
    lines: L('小住京华|早又是中秋佳节|为篱下黄花开遍|秋容如拭|四面歌残终破楚|八年风味徒思浙|苦将侬强派作蛾眉|殊未屑|身不得|男儿列|心却比|男儿烈|算平生肝胆|因人常热|俗子胸襟谁识我|英雄末路当磨折|莽红尘|何处觅知音|青衫湿'),
    fx: [mist('250,230,190'), maple(14), sun(0.28, '255,160,80'), wind(0.2), petals(8)] },
);
})();

// 三卷：取「登堂入室」之意。小学、初中、高中只作提示，界面上用卷名。
var POEM_JUAN = [
  { id: 'primary', name: '启蒙', hint: '小学' },
  { id: 'junior', name: '登堂', hint: '初中' },
  { id: 'senior', name: '入室', hint: '高中' },
];

function extendedScenes() {
  return EXTENDED.map((p) => ({
    origin: '68% 58%',
    ...p,
    img: `assets/${p.id}.jpg`,
    create: (env) => createFx(env, p.fx),
  }));
}

// 默认只开启蒙卷；三卷可任意组合，但至少留一卷
function poemLibs() {
  const saved = localStorage.getItem('poem.juan');
  const on = new Set((saved == null ? 'primary' : saved).split(',').filter(Boolean));
  if (!POEM_JUAN.some((j) => on.has(j.id))) on.add('primary');
  return Object.fromEntries(POEM_JUAN.map((j) => [j.id, on.has(j.id)]));
}

function savePoemLibs(libs) {
  localStorage.setItem('poem.juan', POEM_JUAN.filter((j) => libs[j.id]).map((j) => j.id).join(','));
}

function allPoems() {
  const list = sceneList();
  for (const s of list) s.lib = 'primary';
  return list.concat(extendedScenes());
}

function collectPoems() {
  const libs = poemLibs();
  return allPoems().filter((s) => libs[s.lib]);
}

// 一百五十五 之类的中文数字，目录标题用
function cnNum(n) {
  const d = '零一二三四五六七八九';
  if (n < 10) return d[n];
  if (n < 20) return '十' + (n % 10 ? d[n % 10] : '');
  if (n < 100) return d[(n / 10) | 0] + '十' + (n % 10 ? d[n % 10] : '');
  const h = (n / 100) | 0, r = n % 100;
  if (!r) return d[h] + '百';
  return d[h] + '百' + (r < 10 ? '零' + d[r] : d[(r / 10) | 0] + '十' + (r % 10 ? d[r % 10] : ''));
}
