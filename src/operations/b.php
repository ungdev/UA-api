<?php
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');

/** 
 * Get header Authorization
 * */
function getAuthorizationHeader(){
    $headers = null;
    if (!empty($_SERVER['Authorization'])) {
        $headers = trim($_SERVER["Authorization"]);
    }
    else if (!empty($_SERVER['HTTP_AUTHORIZATION'])) { //Nginx or fast CGI
        $headers = trim($_SERVER["HTTP_AUTHORIZATION"]);
    } elseif (function_exists('apache_request_headers')) {
        $requestHeaders = apache_request_headers();
        // Server-side fix for bug in old Android versions (a nice side-effect of this fix means we don't care about capitalization for Authorization)
        $requestHeaders = array_combine(array_map('ucwords', array_keys($requestHeaders)), array_values($requestHeaders));
        //print_r($requestHeaders);
        if (isset($requestHeaders['Authorization'])) {
            $headers = trim($requestHeaders['Authorization']);
        }
    }
    return $headers;
}

/**
 * get access token from header
 * */
function getBearerToken() {
    $headers = getAuthorizationHeader();
    // HEADER: Get the access token from the header
    if (!empty($headers)) {
        if (preg_match('/Bearer\s(\S+)/', $headers, $matches)) {
            return $matches[1];
        }
    }
    return null;
}

function response($error, $message) {
    echo json_encode(array("status" => $error, "message" => $message), JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT);
    exit();
}

try {
    // Get API_KEY from environment variable and remove the quotes
    $key = str_replace('"', '', getenv('API_KEY') ?? response(1, 'API_KEY not found in environnement'));

    $allowed_paths = ['tournaments', 'partners'];
    $allowed_file_types = ['image/png', 'image/jpeg', 'application/pdf'];
    $allowed_extensions = ['png', 'jpg', 'pdf'];

    // Get the bearer token from the header with the Bearer prefix
    $bearer = getBearerToken();


    $file = './file.txt';
    $content = serialize(getBearerToken());
    file_put_contents($file, $content);

    // Check if the API_KEY is correct
    if ($bearer !== $key) {
        response(1, 'Authentification échouée');
    }

    // Code for DELETE method
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        if(empty($_GET) || empty($_GET['path'])) {
            response(1, 'Paramètres manquants');
        }

        $path = '../' . strval(htmlspecialchars(filter_var($_GET['path'])));

        if(!in_array(explode('/', $path)[1], $allowed_paths)) {
            response(1, 'Le chemin n\'est pas autorisé');
        }

        if (file_exists($path)) {
            unlink($path);
            response(0, 'Fichier supprimé avec succès');
        } else {
            response(1, 'Le fichier n\'existe pas');
        }
    }


    // Test if $_POST contains everything we need
    if (empty($_FILES) || empty($_FILES['file']) || empty($_POST) || empty($_POST['name']) || empty($_POST['path'])) {
        // Return error
        response(1, "Paramètres manquants");
    }

    // Max file size is 5MB
    if ($_FILES['file']['size'] > 5000000) {
        response(1, 'La taille maximale d\'un fichier est de 5MB');
    }

    // Check $_FILES['file']['error'] value.
    switch ($_FILES['file']['error']) {
        case UPLOAD_ERR_OK:
            break;
        case UPLOAD_ERR_NO_FILE:
            response(1, 'Aucun fichier n\'a été envoyé');
        case UPLOAD_ERR_INI_SIZE:
        case UPLOAD_ERR_FORM_SIZE:
            response(1, 'Limite de taille de fichier dépassée');
        default:
            response(1, 'Erreur inconnue');
    }

    // Store the file in a variable
    $file = $_FILES['file'];

    if(!in_array($file['type'], $allowed_file_types)) {
        response(1, 'Type de fichier non autorisé');
    }

    // Filter the parameters and store them in variables
    $name = strval(htmlspecialchars($_POST['name']));
    $path = '../' . strval(htmlspecialchars(filter_var($_POST['path'])));

    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);

    if(!in_array($extension, $allowed_extensions)) {
        response(1, 'Extension de fichier non autorisée');
    }

    // Get the full name of the file with the extension
    $file_name = $name . '.' . $extension;

    // Get the full path of the file
    $file_path = $path . '/' . $file_name;

    // Check if the path exists
    if (!file_exists($path)) {
        response(1, 'Le chemin n\'existe pas');
    }

    // Check if the path is in the allowed paths
    if(!in_array(explode('/', $path)[1], $allowed_paths)) {
        response(1, 'Le chemin n\'est pas autorisé');
    }

    // Check if the file already exists if it does, delete it
    if (file_exists($file_path)) {
        unlink($file_path);
    }

    // Move the file to the path
    if (move_uploaded_file($file['tmp_name'], $file_path)) {
        // Return success
        response(0, 'Fichier téléversé avec succès');
    } else {
        // Return error
        response(1, 'Erreur lors du téléversement du fichier');
    }
}
catch (\Error $e) {
   // do your catching
    response(1, $e->getMessage());
}