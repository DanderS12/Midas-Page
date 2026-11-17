// Startup feedback is independent of Firebase so a failed SDK download cannot trap visitors.
(function(){
  var screen=document.getElementById('midas-loading'),message=document.getElementById('loading-message'),actions=document.getElementById('loading-actions'),finished=false;
  var slow=setTimeout(function(){if(!finished){message.textContent='Taking longer than usual. Check your connection or try again.';actions.hidden=false;}},12000);
  function ready(){finished=true;clearTimeout(slow);screen.hidden=true;document.body.removeAttribute('aria-busy');}
  function failed(){if(finished)return;clearTimeout(slow);message.textContent='We could not connect to the golden room. Please check your connection and retry.';actions.hidden=false;}
  function visibility(){document.body.classList.toggle('effects-hidden',document.hidden);}
  document.addEventListener('visibilitychange',visibility);visibility();
  window.MidasLoading={ready:ready,failed:failed};
  document.getElementById('loading-retry').addEventListener('click',function(){location.reload();});
  document.getElementById('loading-dismiss').addEventListener('click',ready);
  addEventListener('offline',failed);
})();
