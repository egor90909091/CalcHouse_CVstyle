import aiohttp
import asyncio
import json
import time
from typing import Dict

STYLE_DICT = {
    "Asian": "в азиатском стиле",
    "Boho": "в стиле бохо",
    "Contemporary": "в современном стиле",
    "Country": "дуб",
    "Eclectic": "в эклектичном стиле",
    "Ecostyle": "в экостиле",
    "English Style": "в английском стиле",
    "Futurism": "в стиле футуризм",
    "Loft": "в стиле лофт",
    "Mediterranean (Coastal)": "в средиземноморском стиле",
    "Minimalism": "в стиле минимализм",
    "Modern": "в современном стиле",
    "Neoclassicism": "в неоклассическом стиле",
    "Provence": "в стиле прованс",
    "Rustic": "дуб",
    "Scandinavian": "в скандинавском стиле",
    "Victorian": "в викторианском стиле",
    "" :""

}

async def get_furniture_by_style(style: str, furniture: str, max_items: int = 5) -> Dict:
    if style not in STYLE_DICT:
        raise ValueError(f"Invalid style. Available styles: {', '.join(STYLE_DICT.keys())}")
    
    start_time = time.time()
    results_dict = {}
    page = 1
    max_pages = 3  # Maximum number of pages to check
    
    async with aiohttp.ClientSession() as session:
        while len(results_dict) < max_items and page <= max_pages:
            cookies = {
                '_wbauid': '1342311911768136767',
                'x_wbaas_token': '1.1000.0bf54b8b0e99462d8f9c45314bbf8505.MHw3Ny43OS4xODMuMjV8TW96aWxsYS81LjAgKFgxMTsgTGludXggeDg2XzY0OyBydjoxNDkuMCkgR2Vja28vMjAxMDAxMDEgRmlyZWZveC8xNDkuMHwxNzc3ODI3MjgwfHJldXNhYmxlfDJ8ZXlKb1lYTm9Jam9pSW4wPXwwfDN8MTc3NzIyMjQ4MHwx.MEYCIQDh3vMrcUAbOdYg26c8alDjTlsCRaNWZwIP3cMeW5qA2wIhAPAEC2GfsoYH2Zz+CEm1guOGOTTTDIos5wqTJ0/jwUet',
                'routeb': '1776617683.822.2244.506801|7bfd2016a8d76673b3f5612cfa222b5e',
                'wbx-validation-key': '86c578eb-ede1-4b0f-9e96-6e0830fbfd6e',
                '_cp': '1',
            }


            headers = {
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:149.0) Gecko/20100101 Firefox/149.0',
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                # 'Accept-Encoding': 'gzip, deflate, br, zstd',
                'Referer': 'https://www.wildberries.ru/catalog/0/search.aspx?search=%D1%81%D1%82%D1%83%D0%BB',
                'authorization': 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzY2MTc2ODMsInVzZXIiOiI1MDQxMTUzNyIsInNoYXJkX2tleSI6IjYiLCJjbGllbnRfaWQiOiJ3YiIsInNlc3Npb25faWQiOiIzZGQyMmY1NGViNWE0ZTQ0OWE1MmE1YjMzN2NhNmIzMyIsInBob25lIjoiRkRYWXZucUtieGVRMHpWUXZHdmNtUT09IiwidmFsaWRhdGlvbl9rZXkiOiIxN2YwNDNhYzNiZmY3NmY2MTVkOGRmODYyMzUyMGQxMjE4OWNlY2QyY2MxOGRlNWRhNGU1MWUzNWU3ZWJlZjU3IiwidXNlcl9yZWdpc3RyYXRpb25fZHQiOjE2NzQwNDg1NDgsInZlcnNpb24iOjJ9.BUttXBnJiP1wfYUCmxndarTELaxXaILZEqBythVDFtbLTskmmu2Puo8aXsL5dYDYyBRPm4AFIUxGLCO-Tna2A4-3gAs7-zh8IU66MiDBZqAF2tmvtvnk6lce1PIHSVwakgxuHgBIZ_4bb3EVuAOvnSiW5H6PAXGKTCG677nJ7oat03wJKnqDEPwb8chg5zel_6IixOvGCDuSwDeVlF6Dy1JUI66HnWaq_HwTHH5qL8GgB65xbAoeDcg_sbG5FbLOSlA5V1AxjLbvOvPSacXZWNXQ_jqLpDwE_4QZ_2g4I-1osmPv5GSxWZ0ZN1V0CbDy8V-QmchApXCoz9Ve4FlX1w',
                'deviceid': 'site_3995d464d4c9466491bed477af984ac6',
                'x-queryid': 'qid134231191176813676720260419165447',
                'x-requested-with': 'XMLHttpRequest',
                'x-spa-version': '14.6.0',
                'x-userdata': 'AQMDAAoBAAIEAAMAADwAAAAAAAAAMQkBSC4',
                'x-userid': '50411537',
                'Connection': 'keep-alive',
                # 'Cookie': '_wbauid=1342311911768136767; x_wbaas_token=1.1000.0bf54b8b0e99462d8f9c45314bbf8505.MHw3Ny43OS4xODMuMjV8TW96aWxsYS81LjAgKFgxMTsgTGludXggeDg2XzY0OyBydjoxNDkuMCkgR2Vja28vMjAxMDAxMDEgRmlyZWZveC8xNDkuMHwxNzc3ODI3MjgwfHJldXNhYmxlfDJ8ZXlKb1lYTm9Jam9pSW4wPXwwfDN8MTc3NzIyMjQ4MHwx.MEYCIQDh3vMrcUAbOdYg26c8alDjTlsCRaNWZwIP3cMeW5qA2wIhAPAEC2GfsoYH2Zz+CEm1guOGOTTTDIos5wqTJ0/jwUet; routeb=1776617683.822.2244.506801|7bfd2016a8d76673b3f5612cfa222b5e; wbx-validation-key=86c578eb-ede1-4b0f-9e96-6e0830fbfd6e; _cp=1',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'Priority': 'u=4',
                'Pragma': 'no-cache',
                'Cache-Control': 'no-cache',
                # Requests doesn't support trailers
                # 'TE': 'trailers',
            }
            params = {
                'ab_testing': 'false',
                'appType': '1',
                'curr': 'rub',
                'dest': '12358496',
                'hide_dtype': '13',
                'lang': 'ru',
                'page': str(page),
                'query': f'{furniture} {STYLE_DICT[style]}',
                'resultset': 'catalog',
                'sort': 'popular',
                'spp': '30',
                'suppressSpellcheck': 'false',
                'uclusters': '1',
            }
            
            async with session.get('https://search.wb.ru/exactmatch/ru/common/v4/search', params=params, cookies=cookies, headers=headers) as response:
                text = await response.text()
                try:
                    data = json.loads(text)
                    products = data.get('products', [])
                    if not products:  # If no products found, break the loop
                        await asyncio.sleep(0.1)
                        continue
                except json.JSONDecodeError:
                    # if response.status == 429:
                    #     print("Too many requests")
                    # print(f"Ошибка декодирования JSON: {text}")
                    await asyncio.sleep(0.1)
                    continue
                
            
            server_order = list(range(10, 21)) + list(range(1, 10)) + list(range(21, 26))
            
            async def check_server(session, server_num, product_id, link_to_item):
                link_to_image = f'https://basket-{server_num}.wbbasket.ru/vol{str(product_id)[:4]}/part{str(product_id)[:6]}/{product_id}/images/c516x688/1.webp'
                try:
                    async with session.get(link_to_image, timeout=aiohttp.ClientTimeout(total=1)) as img_response:
                        if img_response.status == 200:
                            return link_to_image
                except:
                    pass
                return None
            
            async def process_product(product):
                product_id = product['id']
                link_to_item = f'https://www.wildberries.ru/catalog/{product_id}/detail.aspx'
                
                # Skip if we already have this product
                if link_to_item in results_dict:
                    return
                
                tasks = [check_server(session, server, product_id, link_to_item) for server in server_order]
                results = await asyncio.gather(*tasks)
                
                for result in results:
                    if result:
                        # Get price from product data
                        price = product.get('sizes', [{}])[0].get('price', {}).get('product', 0) // 100
                        results_dict[link_to_item] = {
                            "image_url": result,
                            "price": price
                        }
                        break
            
            # Process more products than needed to account for potential failures
            await asyncio.gather(*[process_product(product) for product in products[:max_items * 2]])
            
            page += 1
            
            # If we have enough items, break the loop
            if len(results_dict) >= max_items:
                break
    
    print(f"Время выполнения: {time.time() - start_time:.2f} секунд")
    return dict(list(results_dict.items())[:max_items])  # Ensure we return exactly max_items 