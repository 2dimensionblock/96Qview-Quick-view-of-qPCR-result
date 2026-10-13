import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../', import.meta.url));
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
let html = read('frontend/legacy.html');
// Keep the original bundled third-party code/fonts intact; patch only app-owned business logic.
const start = html.indexOf('function Ig(e)'), end = html.indexOf('var vR=F(Re())', start);
assert.ok(start > 0 && end > start);
let app = html.slice(start, end).replace(/\\u([a-fA-F0-9]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
function replace(before, after) {
  assert.equal(app.split(before).length - 1, 1, `Expected one patch anchor: ${before.slice(0, 90)}`);
  app = app.replace(before, () => after);
}
function replaceSection(from, to, replacement) {
  const begin = app.indexOf(from), finish = app.indexOf(to, begin);
  assert.ok(begin >= 0 && finish > begin, from);
  app = app.slice(0, begin) + replacement + app.slice(finish);
}
replaceSection('function wk(e)', 'var Xi=', read('frontend/import.js') + '\n');
replaceSection('function wg(', 'async function Iw(', read('frontend/chart.js') + '\n');
replace('function _v(){', read('frontend/plate.js') + '\n' + read('frontend/reference-controls.js') + '\nfunction _v(){let[plateOpen,setPlateOpen]=Ue.useState(false),[namingError,setNamingError]=Ue.useState(""),[chartType,setChartType]=Ue.useState("line");');
replace('function xw(e,t){', 'function xw(e,t){e=Q96analysisRows(e,t.reference);');
replace('let D=[...g];', 'let D=[...g];if(v.some(row=>row.referenceOverride===t.reference))D.push("内参检测类型由用户确认为样本（原表标为阴性对照）");');
replace('className:"results",children:[', 'className:"results",children:[Ue.createElement(Q96ReferenceConflict,{rows:e,reference:f.reference,onChange:(candidates,use)=>{const ids=new Set(candidates.map(row=>row.id));t(previous=>previous.map(row=>ids.has(row.id)?{...row,referenceOverride:use?f.reference:null}:row));h("");Q(true)}}),');
replace('function Ce(C,K,le=!1){', 'function Ce(C,K,le=!1,mapping=d){setPlateOpen(false);setNamingError(Q96.failureReason(C,mapping));');
replace('Ce(Oo,C.name)', 'Ce(Oo,C.name,false,je)');
replace('function Je(){', 'function Je(){setNamingError("");setPlateOpen(false);');
replace('t([]),L(!0),h("未自动识别到 Ct 列，请选择表头行并映射列名。")', 't([]),h("未自动识别到 Ct 列，请打开“列名映射”，选择表头行并指定 Ct 列。")');
replace('className:"studio",children:[', `className:"studio",children:[
  plateOpen&&Ue.createElement(Q96PlateEditor,{rows:e,onClose:()=>setPlateOpen(false),onApply:(rows,label)=>{const defaults=jc(rows);t(rows);p(previous=>({...previous,reference:rows.some(row=>row.gene===previous.reference)?previous.reference:defaults.reference,refGroup:"__same",calGroup:defaults.calGroup,calTime:defaults.calTime}));N(label);V([]);j("");h("");setNamingError("");setPlateOpen(false);Q(true)}}),
  namingError&&Ue.createElement(Q96NamingFailure,{reason:namingError,onClose:()=>setNamingError(""),onMapping:()=>{setNamingError("");L(true)},onPlate:()=>{setNamingError("");setPlateOpen(true)}}),`);
replace('className:"heading-actions",children:[', 'className:"heading-actions",children:[Ue.createElement("button",{className:"button",disabled:v||!e.length,onClick:()=>setPlateOpen(true)},"孔自定义"),');
replace('children:["qPCR ",(0,b.jsx)("i",{children:"Studio"})]', 'children:["96",(0,b.jsx)("i",{children:"Qview"})]');
replace('className:"brand-mark",children:"q"', 'className:"brand-mark",children:"96"');
replace('(0,b.jsxs)("button",{className:"plain-btn method-btn"', 'Ue.createElement("details",{className:"author-menu"},Ue.createElement("summary",null,"关于作者"),Ue.createElement("div",{className:"author-links"},Ue.createElement("a",{href:"https://github.com/2dimensionblock",target:"_blank",rel:"noopener noreferrer"},"GitHub · 2dimensionblock"),Ue.createElement("a",{href:"https://github.com/2dimensionblock/qPCR-studio-Quick-view-of-qPCR-result",target:"_blank",rel:"noopener noreferrer"},"前往发布页"))),(0,b.jsxs)("button",{className:"plain-btn method-btn"');
replace(',(0,b.jsx)("p",{className:"author-signature",children:"Steven Liu"})', '');
replace('(0,b.jsx)("h2",{children:"绘图设置"})]})', '(0,b.jsx)("h2",{children:"绘图设置"})]}),Ue.createElement("label",{className:"field chart-kind"},Ue.createElement("span",null,"图形类型"),Ue.createElement("select",{value:chartType,"aria-label":"图形类型",onChange:event=>setChartType(event.target.value)},Ue.createElement("option",{value:"line"},"折线图 + 误差棒"),Ue.createElement("option",{value:"bar"},"柱形图 + 误差棒"),Ue.createElement("option",{value:"overlay"},"柱形图 + 折线图 + 误差棒")))');
replace('(wg,{summary:H.summary', '(wg,{chartType:chartType,summary:H.summary');
replace('自动跳过仪器信息。若命名为“基因-组别-时间点”，可从样本名称识别；其他布局请指定对应列。', '自动跳过仪器信息。支持“基因-时间”和“基因-组别-时间”；按整表命名位置的数字最大值判断分组，显式列优先。也可使用“孔自定义”。');
app = app.replaceAll('qPCR Studio', '96Qview').replaceAll('时间点 / Time point', '组别 / 时间、浓度、温度或自定义').replaceAll('时间点 / 横轴', '组别值 / 横轴').replaceAll('qpcr_', '96Qview_');
html = html.slice(0, start) + app + html.slice(end);
html = html.replace('<title>qPCR Studio</title>', '<title>96Qview</title>');
html = html.replace('<script>', () => '<script>\n' + read('frontend/naming.cjs') + '\n</script>\n<script>');
html = html.replace('</head>', () => '<style>\n' + read('frontend/extensions.css') + '\n</style>\n</head>');
fs.writeFileSync(path.join(root, 'app/index.html'), html);
console.log('Built self-contained 96Qview frontend.');
