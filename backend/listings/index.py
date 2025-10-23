'''
Business: Управление объявлениями - создание, получение списка, удаление
Args: event - dict с httpMethod, body, queryStringParameters
      context - объект с request_id
Returns: HTTP response со списком объявлений или результатом операции
'''

import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    if method == 'GET':
        cur.execute("""
            SELECT l.id, l.title, l.description, l.image_url, l.created_at, 
                   u.username, u.id as user_id, u.avatar_url
            FROM listings l
            JOIN users u ON l.user_id = u.id
            WHERE l.is_active = true AND u.is_removed = false
            ORDER BY l.created_at DESC
        """)
        listings = []
        for row in cur.fetchall():
            listings.append({
                'id': row[0],
                'title': row[1],
                'description': row[2],
                'imageUrl': row[3],
                'createdAt': row[4].isoformat() if row[4] else None,
                'username': row[5],
                'userId': row[6],
                'userAvatar': row[7]
            })
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'isBase64Encoded': False,
            'body': json.dumps({'listings': listings})
        }
    
    elif method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        user_id = body_data.get('userId')
        title = body_data.get('title', '').strip()
        description = body_data.get('description', '').strip()
        image_url = body_data.get('imageUrl', '')
        
        if not user_id or not title or not description:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'User ID, title and description required'})
            }
        
        cur.execute(
            "INSERT INTO listings (user_id, title, description, image_url, created_at, is_active) VALUES (%s, %s, %s, %s, NOW(), true) RETURNING id",
            (user_id, title, description, image_url)
        )
        listing_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'isBase64Encoded': False,
            'body': json.dumps({'listingId': listing_id})
        }
    
    elif method == 'PUT':
        body_data = json.loads(event.get('body', '{}'))
        listing_id = body_data.get('listingId')
        user_id = body_data.get('userId')
        
        if not listing_id or not user_id:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Listing ID and User ID required'})
            }
        
        cur.execute(
            "UPDATE listings SET is_active = false WHERE id = %s AND user_id = %s",
            (listing_id, user_id)
        )
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'isBase64Encoded': False,
            'body': json.dumps({'success': True})
        }
    
    cur.close()
    conn.close()
    return {
        'statusCode': 405,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps({'error': 'Method not allowed'})
    }
