import urllib.request, urllib.error, json

url = 'https://expense-tracker-soramame1.vercel.app/parse-nlp'
data = json.dumps({'text': 'makan siang 50 ribu'}).encode('utf-8')
headers = {'Content-Type': 'application/json'}
req = urllib.request.Request(url, data=data, headers=headers)

try:
    response = urllib.request.urlopen(req)
    print("SUCCESS:")
    print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTP ERROR {e.code}:")
    print(e.read().decode('utf-8'))
except Exception as e:
    print(f"OTHER ERROR: {e}")
