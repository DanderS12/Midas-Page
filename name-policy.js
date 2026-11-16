// Shared by signup, profile editing, and admin preparation. No account data is stored here.
(function(root){
  function normalize(value){return String(value||'').trim().replace(/\s+/g,' ');}
  function key(value){return normalize(value).toLowerCase();}
  function valid(value){var name=normalize(value);return name.length>=3&&name.length<=24&&/^[A-Za-z0-9_-]+( [A-Za-z0-9_-]+)*$/.test(name);}
  function conflicts(users){var groups={};users.forEach(function(user){var id=key(user.name);if(valid(user.name))(groups[id]||(groups[id]=[])).push(user);});return Object.keys(groups).filter(function(id){return groups[id].length>1;}).map(function(id){return {key:id,users:groups[id]};});}
  var policy={normalize:normalize,key:key,valid:valid,conflicts:conflicts};
  if(typeof module!=='undefined'&&module.exports)module.exports=policy;
  else root.NamePolicy=policy;
})(typeof window!=='undefined'?window:globalThis);
