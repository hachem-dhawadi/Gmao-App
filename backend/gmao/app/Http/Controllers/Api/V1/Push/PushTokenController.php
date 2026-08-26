<?php

namespace App\Http\Controllers\Api\V1\Push;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PushTokenController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate(['token' => 'required|string|max:500']);

        $request->user()->update(['expo_push_token' => $validated['token']]);

        return response()->json(['success' => true]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $request->user()->update(['expo_push_token' => null]);

        return response()->json(['success' => true]);
    }
}
