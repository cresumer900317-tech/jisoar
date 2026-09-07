
var TimerHandleData = null;
var TimerHandleMenu = null;

var xmlhttpModuleData = null;
var ModuleDataTimeout = 0;
var MenuChanged = false;

//-----------

function LogoutClick()
{
  SetLogoutControls();
  SetGlobalVar('token',"");
  SetGlobalVar('user',"");
}

//-----------

function InitializeJavascript()
{
  if (window.navigator.cookieEnabled == false){
    alert("쿠키사용을 제한되었습니다, 이 웹사이트를 사용하기위해서는 브라우저에서 쿠키사용을 가능하게 하여야 합니다.");
  }

  VerifyLoginToken(false);

  PeriodicTimerUpdateModuleData();
  
  var AutoRefreshInterval = 1 * 1000;
  TimerHandleData = setInterval('PeriodicTimerUpdateModuleData()',AutoRefreshInterval);
  TimerHandleMenu = setInterval('PeriodicTimerUpdateMenu()',500);
}

//-----------

function PeriodicTimerUpdateModuleData()
{
  if (ModuleDataTimeout > 0){
    ModuleDataTimeout--;
    return;
  }

  if (xmlhttpModuleData != null){
    xmlhttpModuleData.abort();
  }

  var DataParams = "data=ScopeCardCount+scopeCardErrorCount+PaScopeCardCount+ConfigurableFoCardCount+FFScopeCardCount"+"&data=DiagSlavesDetected";
  
  xmlhttpModuleData = loadXMLDocASynch("data_srv.cgi", DataParams, onStateChangeMenuData, onTimeoutMenuData);
  ModuleDataTimeout = 10;
}

//-----------

function onTimeoutMenuData()
{
  ModuleDataTimeout = 0;
  xmlhttpModuleData.onreadystatechange = function() {}
  xmlhttpModuleData.abort();
}

//-----------

var Previous_ScopeModules      = 0;
var Previous_ScopeErrorModules = 0;
var Previous_PaScopeModules    = 0;
var Previous_FoModules         = 0;
var Previous_FfModules         = 0;
var Previous_DiagSlaveCount    = 0;


function onStateChangeMenuData()
{
  if (xmlhttpModuleData != null){
    if (xmlhttpModuleData.readyState == 4){
      if (xmlhttpModuleData.status == 200){

        var Response = decodeURIComponent(xmlhttpModuleData.responseText);

        var ControlVars = [];

        ControlVars = Response.split("\x1D");

        var ScopeModules      = 0;
        var ScopeErrorModules = 0;
        var PaScopeModules    = 0;
        var FoModules         = 0;
        var FfModules         = 0;
        var DiagSlaveCount    = 0;
        
        if (ControlVars.length >= 6){
          ScopeModules      = parseInt(ControlVars[0]);
          ScopeErrorModules = parseInt(ControlVars[1]);
          PaScopeModules    = parseInt(ControlVars[2]);
          FoModules         = parseInt(ControlVars[3]);
          FfModules         = parseInt(ControlVars[4]);
          DiagSlaveCount    = parseInt(ControlVars[5]);
        }
        
        if (Previous_ScopeModules != ScopeModules){
          Previous_ScopeModules = ScopeModules;
          MenuChanged = true;
        }
        if (Previous_ScopeErrorModules != ScopeErrorModules){
          Previous_ScopeErrorModules = ScopeErrorModules;
          MenuChanged = true;
        }
        if (Previous_PaScopeModules != PaScopeModules){
          Previous_PaScopeModules = PaScopeModules;
          MenuChanged = true;
        }
        if (Previous_FoModules != FoModules){
          Previous_FoModules = FoModules;
          MenuChanged = true;
        }
        if (Previous_FfModules != FfModules){
          Previous_FfModules = FfModules;
          MenuChanged = true;
        }
        if (DiagSlaveCount > 0) DiagSlaveCount = 1;  // only count 0 or 1
        if (Previous_DiagSlaveCount != DiagSlaveCount){
          Previous_DiagSlaveCount = DiagSlaveCount;
          MenuChanged = true;
        }

        onTimeoutMenuData();
      }
    }
  }
}

//-----------

var xmlhttpUpdateMenu = null;

var previousLoginToken = null;
var previousMenuItems = -1;

//-----------

function onTimeoutUpdateMenu()
{
  xmlhttpUpdateMenu.onreadystatechange = function() {}
  xmlhttpUpdateMenu.abort();
}

//-----------

function onStateChangeUpdateMenu()
{
  if (xmlhttpUpdateMenu == null) return;
  if (xmlhttpUpdateMenu.readyState != 4) return;
  if (xmlhttpUpdateMenu.status != 200) return;
  
  var response = decodeURIComponent(xmlhttpUpdateMenu.responseText);

  var ResponseVars = response.split("\x1D");
  var MenuContent   = ResponseVars[0];
    
  var Count = (MenuContent.match(/menu_link/g) || []).length;
  if (Count != previousMenuItems){
    SetInnerHtmlValue("menu_content", MenuContent);
    previousMenuItems = Count;
  }
        
  ModuleDataTimeout = 0;
  PeriodicTimerUpdateModuleData();

  onTimeoutUpdateMenu();
}

//-----------

function PeriodicTimerUpdateMenu()
{
  var loginToken = GetGlobalVar('token',"");
  if ((loginToken != previousLoginToken) || (MenuChanged == true)){
    previousLoginToken = loginToken;
    MenuChanged = false;
    
    xmlhttpUpdateMenu = loadXMLDocASynch("data_srv.cgi","html=menu",onStateChangeUpdateMenu,onTimeoutUpdateMenu);
  }
}

//-----------

function ToggleMenuGroup(section)
{
  var sectionHeader = document.getElementById("link-"+section);
  if (sectionHeader == null) return;
  var sectionContent = document.getElementById("subitems-"+section);
  if (sectionContent == null) return;
  
  if (sectionHeader.classList.toggle("menu_expanded")){
    sectionContent.style.height = sectionContent.scrollHeight + "px";
  } else {
    sectionContent.style.height = "0px";
  }
}