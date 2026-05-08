import requests
r = requests.post('http://127.0.0.1:5000/api/auth/login', json={'email':'admin@smartstore.local','password':'Hao@1909'})
print(r.status_code)
print(r.text)
