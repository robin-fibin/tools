(function(){
if(window._bbBatchRunning){alert('Batch already running.');return;}
window._bbBatchRunning=true;
var hdn=document.getElementById('bodycontect_hdnreportData');
if(!hdn){window._bbBatchRunning=false;alert('Not on BrightBooks Payments Report page.');return;}
var accts;
try{accts=JSON.parse(hdn.value.split('\u00bb')[0]).filter(function(a){return a.value;});}
catch(e){window._bbBatchRunning=false;alert('Could not read account list.');return;}
var cfg=hdn.value.split('\u00bb')[1].split('\u00a7');
var dFrom=cfg[0]||'',dTo=cfg[1]||'';
var panel=document.createElement('div');
panel.style.cssText='position:fixed;top:16px;right:16px;z-index:99999;background:#fff;border:2px solid #009b8d;border-radius:10px;padding:16px 18px;width:290px;font-family:sans-serif;font-size:13px;line-height:1.5;box-shadow:0 4px 20px rgba(0,0,0,.18);';
document.body.appendChild(panel);
var i=0,dl=0,sk=0,all=[];
function render(m){panel.innerHTML='<b style="color:#009b8d">BB Batch Download</b><br>'+m+'<br><hr style="border:none;border-top:1px solid #eee;margin:8px 0"><small style="color:#888">'+i+' of '+accts.length+' | '+dl+' downloaded | '+sk+' empty</small>';}
function selectAcct(guid,cb){var status=document.getElementById('cboStatus');var trigger=status?status.parentElement:null;if(!trigger){cb();return;}trigger.click();var tries=0;var t=setInterval(function(){tries++;var li=document.querySelector('li[data-value="'+guid+'"]');if(li){clearInterval(t);li.click();setTimeout(cb,400);}else if(tries>15){clearInterval(t);cb();}},200);}
function getRows(name){
var rows=document.querySelectorAll('tr.DataRow');
if(!rows.length)return[];
var isNew=rows[0].querySelectorAll('td').length<=8;
var out=[];
rows.forEach(function(row){
var cells=row.querySelectorAll('td');
if(isNew&&cells.length>=4){out.push({Date:cells[0].innerText.trim(),Name:cells[1].innerText.trim(),RefNo:cells[2].innerText.trim(),DocNo:cells[3].innerText.trim(),Gross:cells[4].innerText.trim(),Net:cells[5].innerText.trim(),VAT:cells[6].innerText.trim(),BankName:cells[7].innerText.trim(),AccountName:name});}
else if(!isNew&&cells.length>=10){var h=['Date','Name','NominalCode','NominalDesc','RefNo','DocNo','VATRate','Gross','Net','VAT','BankName'];var o={AccountName:name};h.forEach(function(k,j){o[k]=cells[j].innerText.trim();});out.push(o);}
});
return out;}
function waitAndGo(lenBefore,cb){var tries=0;var t=setInterval(function(){tries++;if(hdn.value.length!==lenBefore||tries>30){clearInterval(t);setTimeout(function(){cb(document.querySelectorAll('tr.DataRow').length>0);},400);}},500);}
function next(){
if(i>=accts.length){
if(all.length>0){var blob=new Blob([JSON.stringify({dateFrom:dFrom,dateTo:dTo,exportedAt:new Date().toISOString(),totalPayments:all.length,payments:all},null,2)],{type:'application/json'});var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download='BB_All_Accounts_'+dFrom.replace(/\//g,'')+'_'+dTo.replace(/\//g,'')+'.json';document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);}
render(all.length>0?'&#x2705; Done &mdash; combined file downloaded.':'&#x2705; Done &mdash; no data found.');
window._bbBatchRunning=false;setTimeout(function(){panel.remove();},6000);return;}
var ac=accts[i];
render('&#x23F3; <b>'+ac.text+'</b>');
selectAcct(ac.value,function(){
var lb=hdn.value.length;
doReportPreview();
waitAndGo(lb,function(has){
if(has){var rows=getRows(ac.text);if(rows.length>0){dl++;all=all.concat(rows);}else{sk++;}}else{sk++;}
i++;setTimeout(next,700);});
});
}
next();
})();
