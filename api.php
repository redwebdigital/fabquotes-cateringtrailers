<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

require_once 'db.php';

function respond($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

function genId() { return bin2hex(random_bytes(8)); }

$action = $_GET['action'] ?? '';
$body   = json_decode(file_get_contents('php://input'), true) ?? [];

try {
    $db = getDB();

    // ---- LOGIN ----
    if ($action === 'login') {
        $username = trim($body['username'] ?? '');
        if (!$username) respond(['error' => 'Username required'], 400);
        $stmt = $db->prepare('SELECT id, username FROM fq_users WHERE username = ?');
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        if (!$user) respond(['error' => 'User not found'], 401);
        respond(['success' => true, 'user' => $user]);
    }

    // ---- GET ALL DATA ----
    if ($action === 'getData') {
        $trailers = $db->query('SELECT * FROM fq_trailers ORDER BY sort_order, created_at')->fetchAll();
        $addons   = $db->query('SELECT * FROM fq_addons ORDER BY sort_order, created_at')->fetchAll();
        $specs    = $db->query('SELECT * FROM fq_specs ORDER BY sort_order, created_at')->fetchAll();
        $quotes   = $db->query('SELECT * FROM fq_quotes ORDER BY created_at DESC')->fetchAll();

        foreach ($trailers as &$t) { $t['price'] = (float)$t['price']; }
        foreach ($addons as &$a) {
            $a['price'] = (float)$a['price'];
            $a['supplier_price'] = $a['supplier_price'] ? (float)$a['supplier_price'] : '';
            $a['supplierUrl']   = $a['supplier_url']   ?? '';
            $a['supplierPrice'] = $a['supplier_price'] ?? '';
        }
        foreach ($quotes as &$q) {
            $q['total']         = (float)$q['total'];
            $q['trailer_price'] = (float)$q['trailer_price'];
            $q['addons']        = json_decode($q['addons_json'] ?? '[]', true);
            $q['specs']         = json_decode($q['specs_json']  ?? '[]', true);
            unset($q['addons_json'], $q['specs_json']);
        }
        respond(['trailers' => $trailers, 'addons' => $addons, 'specs' => $specs, 'quotes' => $quotes]);
    }

    // ---- TRAILERS ----
    if ($action === 'addTrailer') {
        $id = genId(); $name = trim($body['name'] ?? ''); $price = (float)($body['price'] ?? 0);
        if (!$name || $price < 0) respond(['error' => 'Invalid data'], 400);
        $sort = (int)$db->query('SELECT COUNT(*) FROM fq_trailers')->fetchColumn() + 1;
        $db->prepare('INSERT INTO fq_trailers (id,name,price,sort_order) VALUES (?,?,?,?)')->execute([$id,$name,$price,$sort]);
        respond(['success'=>true,'id'=>$id]);
    }
    if ($action === 'updateTrailer') {
        $id = $body['id'] ?? ''; $name = trim($body['name'] ?? ''); $price = (float)($body['price'] ?? 0);
        if (!$id || !$name) respond(['error'=>'Invalid data'],400);
        $db->prepare('UPDATE fq_trailers SET name=?,price=? WHERE id=?')->execute([$name,$price,$id]);
        respond(['success'=>true]);
    }
    if ($action === 'deleteTrailer') {
        $id = $body['id'] ?? '';
        $db->prepare('DELETE FROM fq_trailers WHERE id=?')->execute([$id]);
        respond(['success'=>true]);
    }

    // ---- ADDONS ----
    if ($action === 'addAddon') {
        $id = genId(); $name = trim($body['name'] ?? ''); $price = (float)($body['price'] ?? 0);
        if (!$name || $price < 0) respond(['error'=>'Invalid data'],400);
        $sort = (int)$db->query('SELECT COUNT(*) FROM fq_addons')->fetchColumn() + 1;
        $db->prepare('INSERT INTO fq_addons (id,name,price,sort_order) VALUES (?,?,?,?)')->execute([$id,$name,$price,$sort]);
        respond(['success'=>true,'id'=>$id]);
    }
    if ($action === 'updateAddon') {
        $id = $body['id'] ?? ''; $name = trim($body['name'] ?? ''); $price = (float)($body['price'] ?? 0);
        $supplierUrl = trim($body['supplierUrl'] ?? '');
        $supplierPrice = ($body['supplierPrice'] !== '' && $body['supplierPrice'] !== null) ? (float)$body['supplierPrice'] : null;
        if (!$id || !$name) respond(['error'=>'Invalid data'],400);
        $db->prepare('UPDATE fq_addons SET name=?,price=?,supplier_url=?,supplier_price=? WHERE id=?')->execute([$name,$price,$supplierUrl,$supplierPrice,$id]);
        respond(['success'=>true]);
    }
    if ($action === 'deleteAddon') {
        $id = $body['id'] ?? '';
        $db->prepare('DELETE FROM fq_addons WHERE id=?')->execute([$id]);
        respond(['success'=>true]);
    }

    // ---- SPECS ----
    if ($action === 'addSpec') {
        $id = genId(); $text = trim($body['text'] ?? '');
        if (!$text) respond(['error'=>'Invalid data'],400);
        $sort = (int)$db->query('SELECT COUNT(*) FROM fq_specs')->fetchColumn() + 1;
        $db->prepare('INSERT INTO fq_specs (id,text,sort_order) VALUES (?,?,?)')->execute([$id,$text,$sort]);
        respond(['success'=>true,'id'=>$id]);
    }
    if ($action === 'updateSpec') {
        $id = $body['id'] ?? ''; $text = trim($body['text'] ?? '');
        if (!$id || !$text) respond(['error'=>'Invalid data'],400);
        $db->prepare('UPDATE fq_specs SET text=? WHERE id=?')->execute([$text,$id]);
        respond(['success'=>true]);
    }
    if ($action === 'deleteSpec') {
        $id = $body['id'] ?? '';
        $db->prepare('DELETE FROM fq_specs WHERE id=?')->execute([$id]);
        respond(['success'=>true]);
    }

    // ---- QUOTES ----
    if ($action === 'saveQuote') {
        $id = genId();
        $db->prepare('INSERT INTO fq_quotes (id,user_id,trailer_id,trailer_name,trailer_price,customer_name,customer_phone,notes,total,addons_json,specs_json) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
           ->execute([$id,$body['userId']??null,$body['trailerId']??'',$body['trailerName']??'',(float)($body['trailerPrice']??0),$body['name']??'',$body['phone']??'',$body['notes']??'',(float)($body['total']??0),json_encode($body['addons']??[]),json_encode($body['specs']??[])]);
        respond(['success'=>true,'id'=>$id]);
    }
    if ($action === 'updateQuote') {
        $id = $body['id'] ?? '';
        if (!$id) respond(['error'=>'Invalid id'],400);
        $db->prepare('UPDATE fq_quotes SET trailer_id=?,trailer_name=?,trailer_price=?,customer_name=?,customer_phone=?,notes=?,total=?,addons_json=?,specs_json=? WHERE id=?')
           ->execute([$body['trailerId']??'',$body['trailerName']??'',(float)($body['trailerPrice']??0),$body['name']??'',$body['phone']??'',$body['notes']??'',(float)($body['total']??0),json_encode($body['addons']??[]),json_encode($body['specs']??[]),$id]);
        respond(['success'=>true]);
    }
    if ($action === 'deleteQuote') {
        $id = $body['id'] ?? '';
        $db->prepare('DELETE FROM fq_quotes WHERE id=?')->execute([$id]);
        respond(['success'=>true]);
    }

    // ---- JOBS ----
    if ($action === 'getJobs') {
        $jobs = $db->query('SELECT * FROM fq_jobs ORDER BY created_at DESC')->fetchAll();
        foreach ($jobs as &$j) {
            $stmt = $db->prepare('SELECT * FROM fq_job_items WHERE job_id=? ORDER BY created_at ASC');
            $stmt->execute([$j['id']]);
            $j['items'] = $stmt->fetchAll();
            foreach ($j['items'] as &$i) { $i['cost'] = (float)$i['cost']; }
        }
        respond(['jobs' => $jobs]);
    }
    if ($action === 'addJob') {
        $id = genId(); $name = trim($body['name'] ?? '');
        if (!$name) respond(['error'=>'Job name required'],400);
        $db->prepare('INSERT INTO fq_jobs (id,name,created_by) VALUES (?,?,?)')->execute([$id,$name,$body['userId']??null]);
        respond(['success'=>true,'id'=>$id]);
    }
    if ($action === 'updateJob') {
        $id = $body['id'] ?? ''; $name = trim($body['name'] ?? '');
        if (!$id || !$name) respond(['error'=>'Invalid data'],400);
        $db->prepare('UPDATE fq_jobs SET name=? WHERE id=?')->execute([$name,$id]);
        respond(['success'=>true]);
    }
    if ($action === 'deleteJob') {
        $id = $body['id'] ?? '';
        $db->prepare('DELETE FROM fq_jobs WHERE id=?')->execute([$id]);
        respond(['success'=>true]);
    }
    if ($action === 'addJobItem') {
        $id = genId();
        $jobId   = $body['jobId']  ?? '';
        $name    = trim($body['name']   ?? '');
        $cost    = (float)($body['cost']   ?? 0);
        $paidBy  = trim($body['paidBy']  ?? 'Phil123');
        if (!$jobId || !$name) respond(['error'=>'Invalid data'],400);
        $db->prepare('INSERT INTO fq_job_items (id,job_id,name,cost,paid_by) VALUES (?,?,?,?,?)')->execute([$id,$jobId,$name,$cost,$paidBy]);
        respond(['success'=>true,'id'=>$id]);
    }
    if ($action === 'updateJobItem') {
        $id = $body['id'] ?? '';
        $name   = trim($body['name']  ?? '');
        $cost   = (float)($body['cost']  ?? 0);
        $paidBy = trim($body['paidBy'] ?? 'Phil123');
        if (!$id || !$name) respond(['error'=>'Invalid data'],400);
        $db->prepare('UPDATE fq_job_items SET name=?,cost=?,paid_by=? WHERE id=?')->execute([$name,$cost,$paidBy,$id]);
        respond(['success'=>true]);
    }
    if ($action === 'deleteJobItem') {
        $id = $body['id'] ?? '';
        $db->prepare('DELETE FROM fq_job_items WHERE id=?')->execute([$id]);
        respond(['success'=>true]);
    }

    respond(['error'=>'Unknown action'],400);
} catch (Exception $e) {
    respond(['error'=>$e->getMessage()],500);
}
