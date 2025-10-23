'''
Business: Система сообщений между пользователями с поддержкой ответов
Args: event - dict с httpMethod, body, queryStringParameters
      context - объект с request_id
Returns: HTTP response со списком сообщений или результатом отправки
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
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    if method == 'GET':
        params = event.get('queryStringParameters', {}) or {}
        user_id = params.get('userId')
        chat_with = params.get('chatWith')
        
        if not user_id:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'User ID required'})
            }
        
        if chat_with:
            cur.execute("""
                SELECT m.id, m.from_user_id, m.to_user_id, m.content, m.is_read, 
                       m.reply_to_id, m.created_at, u.username, u.avatar_url
                FROM messages m
                JOIN users u ON m.from_user_id = u.id
                WHERE (m.from_user_id = %s AND m.to_user_id = %s) 
                   OR (m.from_user_id = %s AND m.to_user_id = %s)
                ORDER BY m.created_at ASC
            """, (user_id, chat_with, chat_with, user_id))
            
            messages = []
            for row in cur.fetchall():
                messages.append({
                    'id': row[0],
                    'fromUserId': row[1],
                    'toUserId': row[2],
                    'content': row[3],
                    'isRead': row[4],
                    'replyToId': row[5],
                    'createdAt': row[6].isoformat() if row[6] else None,
                    'username': row[7],
                    'avatar': row[8]
                })
            
            cur.execute(
                "UPDATE messages SET is_read = true WHERE to_user_id = %s AND from_user_id = %s",
                (user_id, chat_with)
            )
            conn.commit()
        else:
            cur.execute("""
                SELECT DISTINCT ON (other_user) 
                       other_user, u.username, u.avatar_url, m.content, m.created_at,
                       COUNT(*) FILTER (WHERE m.to_user_id = %s AND m.is_read = false) as unread_count
                FROM (
                    SELECT CASE WHEN from_user_id = %s THEN to_user_id ELSE from_user_id END as other_user,
                           content, created_at, to_user_id, is_read
                    FROM messages
                    WHERE from_user_id = %s OR to_user_id = %s
                ) m
                JOIN users u ON u.id = m.other_user
                GROUP BY other_user, u.username, u.avatar_url, m.content, m.created_at
                ORDER BY other_user, m.created_at DESC
            """, (user_id, user_id, user_id, user_id))
            
            messages = []
            for row in cur.fetchall():
                messages.append({
                    'userId': row[0],
                    'username': row[1],
                    'avatar': row[2],
                    'lastMessage': row[3],
                    'lastMessageTime': row[4].isoformat() if row[4] else None,
                    'unreadCount': row[5]
                })
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'isBase64Encoded': False,
            'body': json.dumps({'messages': messages})
        }
    
    elif method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        from_user_id = body_data.get('fromUserId')
        to_user_id = body_data.get('toUserId')
        content = body_data.get('content', '').strip()
        reply_to_id = body_data.get('replyToId')
        listing_id = body_data.get('listingId')
        
        if not from_user_id or not to_user_id or not content:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'From user, to user and content required'})
            }
        
        cur.execute(
            "SELECT COUNT(*) FROM blocked_users WHERE user_id = %s AND blocked_user_id = %s",
            (to_user_id, from_user_id)
        )
        if cur.fetchone()[0] > 0:
            cur.close()
            conn.close()
            return {
                'statusCode': 403,
                'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'You are blocked by this user'})
            }
        
        cur.execute(
            "INSERT INTO messages (from_user_id, to_user_id, content, reply_to_id, listing_id, created_at, is_read) VALUES (%s, %s, %s, %s, %s, NOW(), false) RETURNING id",
            (from_user_id, to_user_id, content, reply_to_id, listing_id)
        )
        message_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'isBase64Encoded': False,
            'body': json.dumps({'messageId': message_id})
        }
    
    cur.close()
    conn.close()
    return {
        'statusCode': 405,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps({'error': 'Method not allowed'})
    }
