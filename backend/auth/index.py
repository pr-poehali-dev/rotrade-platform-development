'''
Business: Регистрация и авторизация пользователей на платформе RoTrade
Args: event - dict с httpMethod, body (username, password для регистрации/входа)
      context - объект с request_id
Returns: HTTP response с токеном пользователя или ошибкой
'''

import json
import os
import hashlib
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    body_data = json.loads(event.get('body', '{}'))
    action = body_data.get('action')
    username = body_data.get('username', '').strip()
    password = body_data.get('password', '')
    
    if not username or not password:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Username and password required'})
        }
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    if action == 'register':
        cur.execute("SELECT id FROM users WHERE username = %s", (username,))
        if cur.fetchone():
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Username already taken'})
            }
        
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        cur.execute(
            "INSERT INTO users (username, password_hash, created_at, reports_count, is_removed) VALUES (%s, %s, NOW(), 0, false) RETURNING id",
            (username, password_hash)
        )
        user_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'isBase64Encoded': False,
            'body': json.dumps({'userId': user_id, 'username': username})
        }
    
    elif action == 'login':
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        cur.execute(
            "SELECT id, username, is_removed FROM users WHERE username = %s AND password_hash = %s",
            (username, password_hash)
        )
        user = cur.fetchone()
        cur.close()
        conn.close()
        
        if not user:
            return {
                'statusCode': 401,
                'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Invalid credentials'})
            }
        
        if user[2]:
            return {
                'statusCode': 403,
                'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Account has been removed'})
            }
        
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'isBase64Encoded': False,
            'body': json.dumps({'userId': user[0], 'username': user[1]})
        }
    
    return {
        'statusCode': 400,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps({'error': 'Invalid action'})
    }
