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
var i=0,sk=0,failed=[],all=[];
function render(m){panel.innerHTML='<b style="color:#009b8d">BB Batch Download</b><br>'+m+'<br><hr style="border:none;border-top:1px solid #eee;margin:8px 0"><small style="color:#888">'+i+' of '+accts.length+' | '+all.length+' rows collected | '+sk+' empty | '+failed.length+' failed</small>';}
function selectAcct(guid,cb){var ul=document.getElementById('cboStatus_Contener');var wrapper=ul?ul.parentElement:null;if(wrapper){wrapper.click();}setTimeout(function(){var li=document.querySelector('li[data-value="'+guid+'"]');if(li){['mousedown','mouseup','click'].forEach(function(e){li.dispatchEvent(new MouseEvent(e,{bubbles:true,cancelable:true}));});setTimeout(cb,600);}else{cb();}},500);}
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
function waitAndGo(timedOutCb,doneCb){
var spinner=document.getElementById('divProcess');
var tries=0;
var t1=setInterval(function(){
tries++;
if(spinner.style.display===''){
clearInterval(t1);tries=0;
var t2=setInterval(function(){
tries++;
if(spinner.style.display==='none'){clearInterval(t2);setTimeout(function(){doneCb(document.querySelectorAll('tr.DataRow').length>0);},300);}
else if(tries>60){clearInterval(t2);timedOutCb();}
},500);
}else if(tries>6){clearInterval(t1);setTimeout(function(){doneCb(document.querySelectorAll('tr.DataRow').length>0);},300);}
},500);}
function downloadJson(data,filename){var blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);}
function finish(){
if(all.length>0){downloadJson({dateFrom:dFrom,dateTo:dTo,exportedAt:new Date().toISOString(),totalPayments:all.length,payments:all},'BB_All_Accounts_'+dFrom.replace(/\//g,'')+'_'+dTo.replace(/\//g,'')+'.json');}
if(failed.length>0){downloadJson({note:'These accounts timed out and should be checked manually.',dateFrom:dFrom,dateTo:dTo,accounts:failed},'BB_Failed_Accounts_'+dFrom.replace(/\//g,'')+'_'+dTo.replace(/\//g,'')+'.json');}
var msg=all.length>0?'&#x2705; Done &mdash; combined file downloaded.':'&#x2705; Done &mdash; no data found.';
if(failed.length>0){msg+='<br>&#x26A0;&#xFE0F; <b>'+failed.length+' account(s) timed out</b> &mdash; check BB_Failed file.';}
render(msg);
window._bbBatchRunning=false;
setTimeout(function(){panel.remove();},10000);}
function next(){
if(i>=accts.length){finish();return;}
var ac=accts[i];
render('&#x23F3; <b>'+ac.text+'</b>');
selectAcct(ac.value,function(){
doReportPreview();
waitAndGo(
function(){failed.push(ac.text);i++;setTimeout(next,700);},
function(has){
if(has){var rows=getRows(ac.text);if(rows.length>0){all=all.concat(rows);}else{sk++;}}else{sk++;}
i++;setTimeout(next,700);});
});
}
render('&#x23F3; Flushing previous report...');
doReportPreview();
waitAndGo(function(){next();},function(){next();});
})();
