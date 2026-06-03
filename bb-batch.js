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

// Required columns — matching will fail without these
var REQUIRED=['Date','Name','Nominal Code','Ref.No.','Doc.No.','Gross','Net'];
// Optional columns — captured if present, null if not
var OPTIONAL=['Nominal Desc.','VAT Rate','VAT','Bank Name','Code','Type','Notes','Currency Code','Currency Gross'];

// Column name normalisation — maps header text to a clean key
var COL_MAP={
  'Date':'Date',
  'Name':'Name',
  'Nominal Code':'NominalCode',
  'Nominal Desc.':'NominalDesc',
  'Ref.No.':'RefNo',
  'Doc.No.':'DocNo',
  'VAT Rate':'VATRate',
  'Gross':'Gross',
  'Net':'Net',
  'VAT':'VAT',
  'Bank Name':'BankName',
  'Allocated':'Allocated',
  'Code':'Code',
  'Type':'Type',
  'Notes':'Notes',
  'Currency Code':'CurrencyCode',
  'Currency Gross':'CurrencyGross'
};

var panel=document.createElement('div');
panel.style.cssText='position:fixed;top:16px;right:16px;z-index:99999;background:#fff;border:2px solid #009b8d;border-radius:10px;padding:16px 18px;width:310px;font-family:sans-serif;font-size:13px;line-height:1.5;box-shadow:0 4px 20px rgba(0,0,0,.18);';
document.body.appendChild(panel);

var i=0,sk=0,failed=[],all=[];
var colIdx=null; // built once from header row, reused for all accounts

function render(m){panel.innerHTML='<b style="color:#009b8d">BB Batch Download</b><br>'+m+'<br><hr style="border:none;border-top:1px solid #eee;margin:8px 0"><small style="color:#888">'+i+' of '+accts.length+' | '+all.length+' rows collected | '+sk+' empty | '+failed.length+' failed</small>';}

function buildColIndex(){
  // Find the header row — look for a tr containing th or td with 'Date' as first cell
  var allRows=document.querySelectorAll('tr');
  for(var r=0;r<allRows.length;r++){
    var cells=allRows[r].querySelectorAll('th,td');
    if(cells.length>0&&cells[0].innerText.trim()==='Date'){
      var idx={};
      for(var c=0;c<cells.length;c++){
        var label=cells[c].innerText.trim();
        if(COL_MAP[label]!==undefined){idx[label]=c;}
      }
      return idx;
    }
  }
  return null;
}

function validateCols(idx){
  var missing=[];
  REQUIRED.forEach(function(col){
    if(idx[col]===undefined){missing.push(col);}
  });
  return missing;
}

function getRows(accountName){
  var rows=document.querySelectorAll('tr.DataRow');
  if(!rows.length)return[];

  // Build column index once
  if(!colIdx){
    colIdx=buildColIndex();
    if(!colIdx){
      window._bbBatchRunning=false;
      alert('Could not find header row in report. Please check the report is loaded correctly.');
      return null;
    }
    var missing=validateCols(colIdx);
    if(missing.length>0){
      window._bbBatchRunning=false;
      alert('Report is missing required columns:\n\n'+missing.join('\n')+'\n\nPlease add these columns to the report and try again.');
      return null;
    }
  }

  var out=[];
  rows.forEach(function(row){
    var cells=row.querySelectorAll('td');
    if(!cells.length)return;

    // Skip Purchase Ledger Control rows (Nominal Code = 812)
    var nomRaw=colIdx['Nominal Code']!==undefined?cells[colIdx['Nominal Code']].innerText.trim():'';
    if(nomRaw==='812')return;

    // Skip rows with zero or empty Gross
    var grossRaw=colIdx['Gross']!==undefined?cells[colIdx['Gross']].innerText.trim().replace(/,/g,''):'';
    if(!grossRaw||parseFloat(grossRaw)===0)return;

    var o={AccountName:accountName};

    // Required columns
    REQUIRED.forEach(function(col){
      var key=COL_MAP[col];
      o[key]=cells[colIdx[col]].innerText.trim();
    });

    // Optional columns
    OPTIONAL.forEach(function(col){
      var key=COL_MAP[col];
      o[key]=colIdx[col]!==undefined?cells[colIdx[col]].innerText.trim():null;
    });

    out.push(o);
  });
  return out;
}

function selectAcct(guid,cb){
  var ul=document.getElementById('cboStatus_Contener');
  var wrapper=ul?ul.parentElement:null;
  if(wrapper){wrapper.click();}
  setTimeout(function(){
    var li=document.querySelector('li[data-value="'+guid+'"]');
    if(li){
      ['mousedown','mouseup','click'].forEach(function(e){li.dispatchEvent(new MouseEvent(e,{bubbles:true,cancelable:true}));});
      setTimeout(cb,600);
    }else{cb();}
  },500);
}

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
  },500);
}

function downloadJson(data,filename){
  var blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');a.href=url;a.download=filename;
  document.body.appendChild(a);a.click();
  document.body.removeChild(a);URL.revokeObjectURL(url);
}

function finish(){
  if(all.length>0){downloadJson({dateFrom:dFrom,dateTo:dTo,exportedAt:new Date().toISOString(),totalPayments:all.length,payments:all},'BB_All_Accounts_'+dFrom.replace(/\//g,'')+'_'+dTo.replace(/\//g,'')+'.json');}
  if(failed.length>0){downloadJson({note:'These accounts timed out and should be checked manually.',dateFrom:dFrom,dateTo:dTo,accounts:failed},'BB_Failed_Accounts_'+dFrom.replace(/\//g,'')+'_'+dTo.replace(/\//g,'')+'.json');}
  var msg=all.length>0?'&#x2705; Done &mdash; combined file downloaded.':'&#x2705; Done &mdash; no data found.';
  if(failed.length>0){msg+='<br>&#x26A0;&#xFE0F; <b>'+failed.length+' account(s) timed out</b> &mdash; check BB_Failed file.';}
  render(msg);
  window._bbBatchRunning=false;
  setTimeout(function(){panel.remove();},10000);
}

function next(){
  if(i>=accts.length){finish();return;}
  var ac=accts[i];
  render('&#x23F3; <b>'+ac.text+'</b>');
  selectAcct(ac.value,function(){
    doReportPreview();
    waitAndGo(
      function(){failed.push(ac.text);i++;setTimeout(next,700);},
      function(has){
        if(has){
          var rows=getRows(ac.text);
          if(rows===null){return;} // validation failed — abort
          if(rows.length>0){all=all.concat(rows);}else{sk++;}
        }else{sk++;}
        i++;setTimeout(next,700);
      }
    );
  });
}

render('&#x23F3; Flushing previous report...');
doReportPreview();
waitAndGo(function(){next();},function(){next();});
})();
