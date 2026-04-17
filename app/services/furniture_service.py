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
            params = {
                'ab_testing': 'false',
                'appType': '1',
                'curr': 'rub',
                'dest': '12358495',
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
            
            async with session.get('https://search.wb.ru/exactmatch/ru/common/v14/search', params=params) as response:
                text = await response.text()
                try:
                    data = json.loads(text)
                    products = data.get('products', [])
                    if not products:  # If no products found, break the loop
                        break
                except json.JSONDecodeError:
                    if response.status == 429:
                        print("Too many requests")
                    print(f"Ошибка декодирования JSON: {text[:200]}")
                    asyncio.sleep(100)
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
                        price = product.get('sizes', [{}])[0].get('price', {}).get('basic', 0) // 100
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