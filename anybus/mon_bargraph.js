
window.onclick = function(event) 
{
	CheckMaintenanceEnableModalOnclick(event);
	CheckMaintenanceDisableModalOnclick(event);
} 

var TimerHandleData = null;
var xmlhttpStatusData = null;
var StatusDataTimeout = 0;

var xmlhttpAction = null;

var paper = [];
var ImageIds = [];

//-----------

function onTimeoutData()
{
  StatusDataTimeout = 0;
  xmlhttpStatusData.onreadystatechange = function() {}
  xmlhttpStatusData.abort();
}

//-----------

function onStateChangeData()
{
  if (xmlhttpStatusData != null){
    if (xmlhttpStatusData.readyState == 4){
      if (xmlhttpStatusData.status == 200){

        var Response = decodeURIComponent(xmlhttpStatusData.responseText);

        var SectionVars = [];

        var ScopeData         = "";
        var BargraphData      = [];
        var GoodLimits        = [];
        var MeasureMethod     = "";
        var MaxStationCount   = 0;

        SectionVars = Response.split("\x1d");
        if (SectionVars.length >= 4){
          BargraphData    = SectionVars[0].split("\x1E");
          GoodLimits      = SectionVars[1].split("\x1F");
          MeasureMethod   = SectionVars[2];
          MaxStationCount = parseInt(SectionVars[3]);
        }

        var GoodLimitLow      = GoodLimits[0];
        var GoodLimitHigh     = GoodLimits[1];

        var ScopeCardIndex = BargraphData[0];
        var VoltageRange   = BargraphData[1];
        BargraphData.splice(0,2);

        WriteBargraphData(ScopeCardIndex,VoltageRange,BargraphData,GoodLimitLow,GoodLimitHigh,MeasureMethod,MaxStationCount);
        onTimeoutData();
      }
    }
  }
}

//-----------

var fun_sorting = [
  function bargraph_sort_address_asc(a, b) 
  { 
    return ((a[0] & 0x7FFF) - (b[0] & 0x7FFF)); 
  } ,
  function bargraph_sort_address_inactive_asc(a, b)  
  {
    if ( (a[0] & 0x8000) && !(b[0] & 0x8000)) return  1;
    if (!(a[0] & 0x8000) &&  (b[0] & 0x8000)) return -1;
    return (a[0] - b[0]); 
  } ,
  function bargraph_sort_address_desc(a, b) 
  { 
    return ((b[0] & 0x7FFF) - (a[0] & 0x7FFF)); 
  } ,
  function bargraph_sort_address_inactive_desc(a, b) 
  { 
    if ( (a[0] & 0x8000) && !(b[0] & 0x8000)) return  1;
    if (!(a[0] & 0x8000) &&  (b[0] & 0x8000)) return -1;
    return (b[0] - a[0]); 
  } ,

  function bargraph_sort_last_asc(a, b)  
  { 
    return (a[1] - b[1]); 
  } ,
  function bargraph_sort_last_inactive_asc(a, b)  
  { 
    if ( (a[0] & 0x8000) && !(b[0] & 0x8000)) return  1;
    if (!(a[0] & 0x8000) &&  (b[0] & 0x8000)) return -1;
    return (a[1] - b[1]); 
  } ,
  function bargraph_sort_last_desc(a, b) 
  { 
    return (b[1] - a[1]); 
  } ,
  function bargraph_sort_last_inactive_desc(a, b) 
  { 
    if ( (a[0] & 0x8000) && !(b[0] & 0x8000)) return  1;
    if (!(a[0] & 0x8000) &&  (b[0] & 0x8000)) return -1;
    return (b[1] - a[1]); 
  } ,

  function bargraph_sort_max_asc(a, b)   
  { 
    return (a[2] - b[2]); 
  } ,
  function bargraph_sort_max_inactive_asc(a, b)   
  { 
    if ( (a[0] & 0x8000) && !(b[0] & 0x8000)) return  1;
    if (!(a[0] & 0x8000) &&  (b[0] & 0x8000)) return -1;
    return (a[2] - b[2]); 
  } ,
  function bargraph_sort_max_desc(a, b ) 
  { 
    return (b[2] - a[2]); 
  } ,
  function bargraph_sort_max_inactive_desc(a, b ) 
  { 
    if ( (a[0] & 0x8000) && !(b[0] & 0x8000)) return  1;
    if (!(a[0] & 0x8000) &&  (b[0] & 0x8000)) return -1;
    return (b[2] - a[2]); 
  } ,

  function bargraph_sort_min_asc(a, b)   
  { 
    return (a[3] - b[3]); 
  } ,
  function bargraph_sort_min_inactive_asc(a, b)   
  { 
    if ( (a[0] & 0x8000) && !(b[0] & 0x8000)) return  1;
    if (!(a[0] & 0x8000) &&  (b[0] & 0x8000)) return -1;
    return (a[3] - b[3]); 
  } ,
  function bargraph_sort_min_desc(a, b ) 
  { 
    return (b[3] - a[3]); 
  } ,
  function bargraph_sort_min_inactive_desc(a, b ) 
  { 
    if ( (a[0] & 0x8000) && !(b[0] & 0x8000)) return  1;
    if (!(a[0] & 0x8000) &&  (b[0] & 0x8000)) return -1;
    return (b[3] - a[3]); 
  } 
];

//-----------

function SortTypeSelectBoxChange()
{
  var Sort1Index = GetSelectBoxIndex("sorttype1_index",0);
  var Sort2Index = GetSelectBoxIndex("sorttype2_index",0);
  var Sort3Index = GetSelectBoxIndex("sorttype3_index",0);
  var SortIndex = (Sort1Index * 4) + (Sort2Index * 2) + Sort3Index;
  SetGlobalVar("BarSortType",SortIndex);
}

//-----------

function WriteBargraphData(ScopeCardIndex,VoltageRange,BargraphData,GoodLimitLow,GoodLimitHigh,MeasureMethod,MaxStationCount)
{
  for(var i=0; i<BargraphData.length; i++){
    BargraphData[i] = BargraphData[i].split("\x1F");
  }

  var SortIndex = GetGlobalVar("BarSortType",0);
  if ((SortIndex < fun_sorting.length) || (SortIndex >= 0)){
    BargraphData.sort(fun_sorting[SortIndex]);
  }
  
  var ImageCount = Math.ceil(BargraphData.length / 16);
  var StationCount = BargraphData.length;
  

  while(ImageCount > ImageIds.length){
    var CurrentIndex = ImageIds.length;
    ImageIds.push(DynamicCreateImage(CurrentIndex));
  }

  while(ImageCount < ImageIds.length){
    DynamicRemoveImage(ImageIds.pop());
  }

  for(var i=0; i<ImageCount; i++){
    var BargraphPart = BargraphData.splice(0,16);
    WriteBargraphDataDetailed(paper[i],BargraphPart,VoltageRange,GoodLimitLow,GoodLimitHigh,MaxStationCount);
  }
  
  var HtmlInsideDiv = [];
  HtmlInsideDiv.push("<div style='width:200px;text-align:center' class='VariableWx'>전체 스테이션: "+StationCount+"</div>");
  HtmlInsideDiv.push("<div style='width:300px;text-align:center' class='VariableWx'>측정 방법: "+MeasureMethod+"</div>");
  SetInnerHtmlValue("PagesArea",HtmlInsideDiv.join("") );
}

//-----------

function DynamicCreateImage(ImageIdx)
{
  var CurrentImage = document.createElement("div");
  CurrentImage.className = "bargraph_large";
  CurrentImage.id = "BargraphImage"+ImageIdx;

  var ContentArea = document.getElementById("images_area");
  if (ContentArea != null){
    ContentArea.appendChild(CurrentImage);
  }
  
  //GoodLimit = parseInt(2500);
  //if (isNaN(GoodLimit)) GoodLimit = 0;
  paper.push(GenerateBargraphDetailed(CurrentImage.id,"",13000));

  return CurrentImage.id;
}

//-----------

function DynamicRemoveImage(ImageId)
{
  var ImageObj = document.getElementById(ImageId);
  if (ImageObj != null){
    var PaperObject = paper.pop();
    PaperObject.clear();
    PaperObject.remove();
    var ContentArea = document.getElementById("images_area");
    if (ContentArea != null){
      ContentArea.removeChild(ImageObj);
    }
  }
}

//-----------

function PeriodicTimerUpdateStatusData()
{
  if (StatusDataTimeout > 0){
    StatusDataTimeout--;
    return;
  }

  if (xmlhttpStatusData != null){
    xmlhttpStatusData.abort();
  }

  var ScopeCardIndex = GetSelectBoxValue('scopecard_index',-1);

  var DataParams     = "data=bargraphData:"+ScopeCardIndex+"+bargraphlimit:"+ScopeCardIndex+"+ScopeMeasMethod:"+ScopeCardIndex+"+PhysStationCount:"+ScopeCardIndex;
  xmlhttpStatusData = loadXMLDocASynch("data_srv.cgi", DataParams, onStateChangeData, onTimeoutData);
  StatusDataTimeout = 10;
}

//-----------

function InitializeJavascript()
{
  var ScopeCard = GetGlobalInt("CardIndex",0);
  SetSelectBoxValue('scopecard_index',ScopeCard);
  
  var SortIndex = GetGlobalVar("BarSortType",0);
  var Sort1Index = (SortIndex >> 2) & 0x03;
  var Sort2Index = (SortIndex >> 1) & 0x01;
  var Sort3Index = (SortIndex     ) & 0x01;
  SetSelectBoxIndex("sorttype1_index",Sort1Index);
  SetSelectBoxIndex("sorttype2_index",Sort2Index);
  SetSelectBoxIndex("sorttype3_index",Sort3Index);
  
  // start the timer(s)
  PeriodicTimerUpdateStatusData();

  var AutoRefreshInterval = 1 * 1000;
  if (AutoRefreshInterval < 1000) AutoRefreshInterval = 1000;
  TimerHandleData = setInterval('PeriodicTimerUpdateStatusData()',AutoRefreshInterval);
}

//-----------

function ScopecardSelectBoxChange()
{
  InvalidateAllImages();
  
  var ScopeCardIndex = GetSelectBoxValue('scopecard_index',-1);
  SetGlobalVar("CardIndex",ScopeCardIndex);
}

//-----------

function InvalidateAllImages()
{
  for(var i=0; i<paper.length; i++){
    InvalidateImage(i);
  }
}

//-----------

function InvalidateImage(ImgIndex)
{
  InvalidateBargraphImage(paper[ImgIndex],"이미지 갱신중...");
}

//-----------

function ResetBargraph()
{
  var ScopeCardIndex = GetSelectBoxValue('scopecard_index',-1);
  var Params = "action=ResetBargraph:"+ScopeCardIndex;
  xmlhttpAction = loadXMLDocASynch("data_srv.cgi", Params, onStateChangeAction, onTimeoutAction);
}

//-----------

function onTimeoutAction()
{
  xmlhttpAction.onreadystatechange = function() {}
  xmlhttpAction.abort();
}

//-----------

function onStateChangeAction()
{
  if (xmlhttpAction != null){
    if (xmlhttpAction.readyState == 4){
      if (xmlhttpAction.status == 200){
        var Response = decodeURIComponent(xmlhttpAction.responseText);
        /* no action taken */
        onTimeoutAction();
      }
    }
  }
}

