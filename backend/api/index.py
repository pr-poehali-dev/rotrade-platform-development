'''
Business: API для платформы RoTrade - управление пользователями, объявлениями, сообщениями
Args: event с httpMethod, body, queryStringParameters
Returns: HTTP response с данными
'''

import json
import os
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    path: str = event.get('queryStringParameters', {}).get('action', '')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    try:
        if method == 'GET':
            if path == 'listings':
                return get_listings()
            elif path == 'messages':
                user_id = event.get('queryStringParameters', {}).get('userId')
                return get_messages(int(user_id) if user_id else None)
            elif path == 'users':
                return get_users()
            elif path == 'reports':
                return get_reports()
            elif path == 'reviews':
                user_id = event.get('queryStringParameters', {}).get('userId')
                return get_reviews(int(user_id) if user_id else None)
            elif path == 'user-coins':
                user_id = event.get('queryStringParameters', {}).get('userId')
                return get_user_coins(int(user_id) if user_id else None)
            elif path == 'deposits':
                user_id = event.get('queryStringParameters', {}).get('userId')
                return get_deposits(int(user_id) if user_id else None)
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            
            if path == 'register':
                return register_user(body)
            elif path == 'login':
                return login_user(body)
            elif path == 'listing':
                return create_listing(body)
            elif path == 'message':
                return send_message(body)
            elif path == 'report':
                return create_report(body)
            elif path == 'review':
                return create_review(body)
            elif path == 'deposit':
                return create_deposit(body)
            elif path == 'feature-listing':
                return feature_listing(body)
        
        elif method == 'DELETE':
            if path == 'listing':
                listing_id = event.get('queryStringParameters', {}).get('id')
                return delete_listing(int(listing_id) if listing_id else None)
            elif path == 'message':
                message_id = event.get('queryStringParameters', {}).get('id')
                return delete_message(int(message_id) if message_id else None)
        
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Not found'}),
            'isBase64Encoded': False
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }

def get_listings() -> Dict[str, Any]:
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute('''
        SELECT l.id, l.user_id, u.username, l.title, l.description, 
               l.image_url, l.game_url, l.game_name, l.created_at,
               l.is_featured, l.featured_until
        FROM listings l
        JOIN users u ON l.user_id = u.id
        WHERE l.is_active = true
        ORDER BY l.is_featured DESC, l.created_at DESC
    ''')
    
    listings = [dict(row) for row in cur.fetchall()]
    
    for listing in listings:
        if listing['created_at']:
            listing['created_at'] = listing['created_at'].isoformat()
        if listing.get('featured_until'):
            listing['featured_until'] = listing['featured_until'].isoformat()
        else:
            listing['featured_until'] = None
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(listings),
        'isBase64Encoded': False
    }

def register_user(data: Dict[str, Any]) -> Dict[str, Any]:
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Username and password required'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute('SELECT id FROM users WHERE username = %s', (username,))
    if cur.fetchone():
        cur.close()
        conn.close()
        return {
            'statusCode': 409,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Username already exists'}),
            'isBase64Encoded': False
        }
    
    avatar_url = f'https://api.dicebear.com/7.x/avataaars/svg?seed={username}'
    
    cur.execute('''
        INSERT INTO users (username, password_hash, avatar_url, created_at, reports_count, is_removed, coins)
        VALUES (%s, %s, %s, %s, 0, false, 0)
        RETURNING id, username, avatar_url, created_at, coins
    ''', (username, password, avatar_url, datetime.now()))
    
    user = dict(cur.fetchone())
    user['created_at'] = user['created_at'].isoformat()
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(user),
        'isBase64Encoded': False
    }

def login_user(data: Dict[str, Any]) -> Dict[str, Any]:
    username = data.get('username')
    password = data.get('password')
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute('''
        SELECT id, username, avatar_url, created_at, coins
        FROM users
        WHERE username = %s AND password_hash = %s
    ''', (username, password))
    
    user = cur.fetchone()
    cur.close()
    conn.close()
    
    if not user:
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid credentials'}),
            'isBase64Encoded': False
        }
    
    user = dict(user)
    user['created_at'] = user['created_at'].isoformat()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(user),
        'isBase64Encoded': False
    }

def create_listing(data: Dict[str, Any]) -> Dict[str, Any]:
    user_id = data.get('userId')
    title = data.get('title')
    description = data.get('description')
    image_url = data.get('imageUrl')
    game_url = data.get('gameUrl')
    game_name = data.get('gameName')
    
    if not user_id or not title or not description:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Missing required fields'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute('''
        INSERT INTO listings (user_id, title, description, image_url, game_url, game_name, created_at, is_active)
        VALUES (%s, %s, %s, %s, %s, %s, %s, true)
        RETURNING id, user_id, title, description, image_url, game_url, game_name, created_at
    ''', (user_id, title, description, image_url, game_url, game_name, datetime.now()))
    
    listing = dict(cur.fetchone())
    
    cur.execute('SELECT username FROM users WHERE id = %s', (user_id,))
    username = cur.fetchone()['username']
    listing['username'] = username
    listing['created_at'] = listing['created_at'].isoformat()
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(listing),
        'isBase64Encoded': False
    }

def delete_listing(listing_id: Optional[int]) -> Dict[str, Any]:
    if not listing_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Listing ID required'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute('UPDATE listings SET is_active = false WHERE id = %s', (listing_id,))
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'success': True}),
        'isBase64Encoded': False
    }

def get_messages(user_id: Optional[int]) -> Dict[str, Any]:
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    if user_id:
        cur.execute(f'''
            SELECT m.id, m.from_user_id, m.to_user_id, m.content, m.reply_to_id, m.created_at
            FROM messages m
            WHERE m.from_user_id = {user_id} OR m.to_user_id = {user_id}
            ORDER BY m.created_at ASC
        ''')
    else:
        cur.execute('''
            SELECT m.id, m.from_user_id, m.to_user_id, m.content, m.reply_to_id, m.created_at
            FROM messages m
            ORDER BY m.created_at ASC
        ''')
    
    messages = [dict(row) for row in cur.fetchall()]
    
    for message in messages:
        if message['created_at']:
            message['created_at'] = message['created_at'].isoformat() if isinstance(message['created_at'], datetime) else message['created_at']
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(messages),
        'isBase64Encoded': False
    }

def send_message(data: Dict[str, Any]) -> Dict[str, Any]:
    from_user_id = data.get('fromUserId')
    to_user_id = data.get('toUserId')
    content = data.get('content')
    reply_to_id = data.get('replyToId')
    
    if not from_user_id or not to_user_id or not content:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Missing required fields'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    content_escaped = content.replace("'", "''")
    now = datetime.now().isoformat()
    reply_to_sql = f"{reply_to_id}" if reply_to_id else "NULL"
    
    cur.execute(f'''
        INSERT INTO messages (from_user_id, to_user_id, content, reply_to_id, created_at, is_read)
        VALUES ({from_user_id}, {to_user_id}, '{content_escaped}', {reply_to_sql}, '{now}', false)
        RETURNING id, from_user_id, to_user_id, content, reply_to_id, created_at
    ''')
    
    message = dict(cur.fetchone())
    message['created_at'] = message['created_at'].isoformat() if isinstance(message['created_at'], datetime) else message['created_at']
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(message),
        'isBase64Encoded': False
    }

def delete_message(message_id: Optional[int]) -> Dict[str, Any]:
    if not message_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Message ID required'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute('DELETE FROM messages WHERE id = %s', (message_id,))
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'success': True}),
        'isBase64Encoded': False
    }

def create_deposit(data: Dict[str, Any]) -> Dict[str, Any]:
    user_id = data.get('userId')
    amount_rub = data.get('amountRub')
    
    if not user_id or not amount_rub:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Missing required fields'}),
            'isBase64Encoded': False
        }
    
    coins_received = int(float(amount_rub) * 1.7)
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute('''
        INSERT INTO deposits (user_id, amount_rub, coins_received, status, created_at)
        VALUES (%s, %s, %s, 'completed', %s)
        RETURNING id, user_id, amount_rub, coins_received, status, created_at
    ''', (user_id, amount_rub, coins_received, datetime.now()))
    
    deposit = dict(cur.fetchone())
    
    cur.execute('UPDATE users SET coins = coins + %s WHERE id = %s', (coins_received, user_id))
    
    cur.execute('''
        INSERT INTO coin_transactions (user_id, amount, type, description, created_at)
        VALUES (%s, %s, 'deposit', 'Пополнение баланса', %s)
    ''', (user_id, coins_received, datetime.now()))
    
    deposit['created_at'] = deposit['created_at'].isoformat()
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(deposit),
        'isBase64Encoded': False
    }

def feature_listing(data: Dict[str, Any]) -> Dict[str, Any]:
    user_id = data.get('userId')
    listing_id = data.get('listingId')
    
    if not user_id or not listing_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Missing required fields'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute('SELECT coins FROM users WHERE id = %s', (user_id,))
    user = cur.fetchone()
    
    if not user or user['coins'] < 10:
        cur.close()
        conn.close()
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Недостаточно монет'}),
            'isBase64Encoded': False
        }
    
    featured_until = datetime.now() + timedelta(days=7)
    
    cur.execute('''
        UPDATE listings 
        SET is_featured = true, featured_until = %s 
        WHERE id = %s AND user_id = %s
        RETURNING id
    ''', (featured_until, listing_id, user_id))
    
    if not cur.fetchone():
        cur.close()
        conn.close()
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Listing not found'}),
            'isBase64Encoded': False
        }
    
    cur.execute('UPDATE users SET coins = coins - 10 WHERE id = %s', (user_id,))
    
    cur.execute('''
        INSERT INTO coin_transactions (user_id, amount, type, description, created_at)
        VALUES (%s, -10, 'feature', 'Размещение на главной', %s)
    ''', (user_id, datetime.now()))
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'success': True}),
        'isBase64Encoded': False
    }

def get_user_coins(user_id: Optional[int]) -> Dict[str, Any]:
    if not user_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'User ID required'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute('SELECT coins FROM users WHERE id = %s', (user_id,))
    user = cur.fetchone()
    
    cur.close()
    conn.close()
    
    if not user:
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'User not found'}),
            'isBase64Encoded': False
        }
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'coins': user['coins']}),
        'isBase64Encoded': False
    }

def get_deposits(user_id: Optional[int]) -> Dict[str, Any]:
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    if user_id:
        cur.execute('''
            SELECT id, user_id, amount_rub, coins_received, status, created_at
            FROM deposits
            WHERE user_id = %s
            ORDER BY created_at DESC
        ''', (user_id,))
    else:
        cur.execute('''
            SELECT id, user_id, amount_rub, coins_received, status, created_at
            FROM deposits
            ORDER BY created_at DESC
        ''')
    
    deposits = [dict(row) for row in cur.fetchall()]
    
    for deposit in deposits:
        if deposit['created_at']:
            deposit['created_at'] = deposit['created_at'].isoformat()
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(deposits),
        'isBase64Encoded': False
    }

def get_users() -> Dict[str, Any]:
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute('''
        SELECT id, username, avatar_url, created_at, reports_count
        FROM users
        WHERE is_removed = false
    ''')
    
    users = [dict(row) for row in cur.fetchall()]
    
    for user in users:
        if user['created_at']:
            user['created_at'] = user['created_at'].isoformat()
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(users),
        'isBase64Encoded': False
    }

def create_report(data: Dict[str, Any]) -> Dict[str, Any]:
    reporter_id = data.get('reporterId')
    reported_user_id = data.get('reportedUserId')
    reason = data.get('reason')
    
    if not reporter_id or not reported_user_id or not reason:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Missing required fields'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    reason_escaped = reason.replace("'", "''")
    now = datetime.now().isoformat()
    
    cur.execute(f'''
        INSERT INTO reports (reporter_id, reported_user_id, reason, created_at)
        VALUES ({reporter_id}, {reported_user_id}, '{reason_escaped}', '{now}')
        RETURNING id, reporter_id, reported_user_id, reason, created_at
    ''')
    
    report = dict(cur.fetchone())
    report['created_at'] = report['created_at'].isoformat() if isinstance(report['created_at'], datetime) else report['created_at']
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(report),
        'isBase64Encoded': False
    }

def get_reports() -> Dict[str, Any]:
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute('''
        SELECT r.id, r.reporter_id, r.reported_user_id, r.reason, r.created_at,
               u1.username as reporter_username, u2.username as reported_username
        FROM reports r
        JOIN users u1 ON r.reporter_id = u1.id
        JOIN users u2 ON r.reported_user_id = u2.id
        ORDER BY r.created_at DESC
    ''')
    
    reports = [dict(row) for row in cur.fetchall()]
    
    for report in reports:
        if report['created_at']:
            report['created_at'] = report['created_at'].isoformat()
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(reports),
        'isBase64Encoded': False
    }

def create_review(data: Dict[str, Any]) -> Dict[str, Any]:
    from_user_id = data.get('fromUserId')
    to_user_id = data.get('toUserId')
    rating = data.get('rating')
    comment = data.get('comment')
    
    if not from_user_id or not to_user_id or rating is None:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Missing required fields'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute('''
        INSERT INTO reviews (from_user_id, to_user_id, rating, comment, created_at)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id, from_user_id, to_user_id, rating, comment, created_at
    ''', (from_user_id, to_user_id, rating, comment, datetime.now()))
    
    review = dict(cur.fetchone())
    review['created_at'] = review['created_at'].isoformat()
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(review),
        'isBase64Encoded': False
    }

def get_reviews(user_id: Optional[int]) -> Dict[str, Any]:
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    if user_id:
        cur.execute('''
            SELECT r.id, r.from_user_id, r.to_user_id, r.rating, r.comment, r.created_at,
                   u.username as from_username
            FROM reviews r
            JOIN users u ON r.from_user_id = u.id
            WHERE r.to_user_id = %s
            ORDER BY r.created_at DESC
        ''', (user_id,))
    else:
        cur.execute('''
            SELECT r.id, r.from_user_id, r.to_user_id, r.rating, r.comment, r.created_at,
                   u.username as from_username
            FROM reviews r
            JOIN users u ON r.from_user_id = u.id
            ORDER BY r.created_at DESC
        ''')
    
    reviews = [dict(row) for row in cur.fetchall()]
    
    for review in reviews:
        if review['created_at']:
            review['created_at'] = review['created_at'].isoformat()
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(reviews),
        'isBase64Encoded': False
    }