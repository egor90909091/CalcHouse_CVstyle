import aiohttp
import asyncio
import json
import time
from typing import Dict

STYLE_DICT = {
    "Asian": "в азиатском стиле",
    "Boho": "в стиле бохо",
    "Contemporary": "в современном стиле",
    "Country": "в деревенском стиле",
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
    "Rustic": "в деревенском стиле",
    "Scandinavian": "в скандинавском стиле",
    "Victorian": "в викторианском стиле"
}

async def get_furniture_by_style(style: str, furniture: str, max_items: int = 5) -> Dict:
    if style not in STYLE_DICT:
        raise ValueError(f"Invalid style. Available styles: {', '.join(STYLE_DICT.keys())}")
    
    params = {
        'ab_testing': 'false',
        'appType': '1',
        'curr': 'rub',
        'dest': '12358495',
        'hide_dtype': '13',
        'lang': 'ru',
        'page': '1',
        'query': f'{furniture} {STYLE_DICT[style]}',
        'resultset': 'catalog',
        'sort': 'popular',
        'spp': '30',
        'suppressSpellcheck': 'false',
        'uclusters': '1',
    }
    
    start_time = time.time()
    results_dict = {}
    
    async with aiohttp.ClientSession() as session:
        async with session.get('https://search.wb.ru/exactmatch/ru/common/v13/search', params=params) as response:
            text = await response.text()
            try:
                data = json.loads(text)
                products = data.get('data', {}).get('products', [])[:max_items]
            except json.JSONDecodeError:
                print(f"Ошибка декодирования JSON: {text[:100]}...")
                return {}
        
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
            
            tasks = [check_server(session, server, product_id, link_to_item) for server in server_order]
            results = await asyncio.gather(*tasks)
            
            for result in results:
                if result:
                    results_dict[link_to_item] = result
                    break
        
        await asyncio.gather(*[process_product(product) for product in products])
    
    print(f"Время выполнения: {time.time() - start_time:.2f} секунд")
    return results_dict 