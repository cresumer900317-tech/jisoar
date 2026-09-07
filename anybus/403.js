
function LoginClick()
{
  var loginData = GetSelectBoxValue('login_user',"").split(":");
	var userName = loginData[0];
	var publicSalt = loginData[1];
	var userPassword = GetTextValue('login_pass',"");
	LoginUser(userName, userPassword, publicSalt);
}

//-----------

function handle_keypress(evt)
{
  var charCode = 0;
  if (evt.charCode > 0) charCode = evt.charCode;
  if (evt.keyCode  > 0) charCode = evt.keyCode;
  if (evt.which    > 0) charCode = evt.which;
  if (charCode != 13) return true;
  
  LoginClick();
  return false;
}

//-----------

function InitializeJavascript()
{
	VerifyLoginToken(true);
}

//-----------