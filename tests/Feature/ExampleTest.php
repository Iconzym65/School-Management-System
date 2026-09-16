<?php

namespace Tests\Feature;

// use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    /**
     * A basic test example.
     */
    public function test_the_application_renders_the_landing_page(): void
    {
        $response = $this->get('/');

        $response->assertOk()->assertSee('landing-page-root', false);
    }
}
